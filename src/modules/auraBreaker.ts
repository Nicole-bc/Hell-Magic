import { getPlayer } from "zois-core";
import { hookFunction, HookPriority } from "zois-core/modsApi";
import { modStorage } from "./storage";
import { isLSCGSpellBeneficial } from "./darkMagic";

// HARDCODED: anti-retribution is always on. There is no setting for it any more.
// Whenever we act on another character, retaliation aimed back at us during the
// window below is undone. This does NOT stop their aura from protecting *them*
// (their own revert still runs) — it only stops the counterattack landing on us.
const IGNORE_ENEMY_AURA = true;

// How long after acting on someone we keep undoing retaliation aimed at us.
const IGNORE_WINDOW_MS = 6000;

let ignoreSnapshot: ItemBundle[] | null = null;
let ignoreUntil = 0;

// Member numbers we acted on recently -> when that window expires. Used to
// recognise a bounced spell as retaliation rather than an unrelated cast.
const recentTargets = new Map<number, number>();

// People on our own whitelist are excluded: if we trust them enough to whitelist
// them, we still want them able to put things on us right after we touch them.
function isExempt(memberNumber: number): boolean {
    return !!modStorage.chaosAura?.whiteList?.includes(memberNumber);
}

function openIgnoreWindow(target: Character): void {
    if (!IGNORE_ENEMY_AURA) return;
    if (isExempt(target.MemberNumber)) return;
    ignoreSnapshot = ServerAppearanceBundle(Player.Appearance);
    ignoreUntil = Date.now() + IGNORE_WINDOW_MS;
    recentTargets.set(target.MemberNumber, ignoreUntil);
}

function inIgnoreWindow(): boolean {
    return IGNORE_ENEMY_AURA && !!ignoreSnapshot && Date.now() <= ignoreUntil;
}

export function loadAuraBreaker(): void {
    // Intercept our own outgoing changes aimed at OTHER characters.
    hookFunction("ServerSend", HookPriority.OBSERVE, (args, next) => {
        const [type, data] = args as [string, any];

        // Resolve the targeted character for the two change message types.
        let target: Character | undefined;
        if (type === "ChatRoomCharacterUpdate" && data?.ID != null && data.ID !== Player.OnlineID) {
            target = ChatRoomCharacter.find((c) => c.OnlineID === data.ID);
        } else if (type === "ChatRoomCharacterItemUpdate" && data?.Target != null && data.Target !== Player.MemberNumber) {
            target = getPlayer(data.Target);
        }

        if (target && !target.IsPlayer()) {
            // DISGUISE: stamp the change's source as the TARGET's own member number,
            // so their aura's self/other check (source === wearer → no revert)
            // classifies it as self-applied. Effective ONLY if the server forwards
            // this field instead of overwriting it with the real sender; otherwise
            // it's a harmless no-op. Test in a live room. Still a setting, since it
            // defeats their protection of themselves rather than protecting us.
            if (modStorage.chaosAura?.disguiseAsSelf) {
                if (type === "ChatRoomCharacterUpdate") {
                    data.SourceMemberNumber = target.MemberNumber;
                } else {
                    data.Source = target.MemberNumber;
                }
            }

            // IGNORE: open the anti-retaliation window unconditionally. We no longer
            // check whether their aura looks enabled — an `unbreakable` aura reports
            // `enabled: false`, and an unsynced player reports nothing at all, so
            // reading their state was the main way this used to silently miss.
            openIgnoreWindow(target);
        }

        return next(args);
    });

    // Undo retaliation applied to US during the ignore window.
    const onMeChanged = () => {
        if (!inIgnoreWindow()) return;
        const now = JSON.stringify(ServerAppearanceBundle(Player.Appearance));
        if (now === JSON.stringify(ignoreSnapshot)) return;
        // Snap back to how we looked the moment we acted (drops forced-on restraints).
        ServerSend("ChatRoomCharacterUpdate", {
            ID: Player.OnlineID,
            ActivePose: Player.ActivePose,
            Appearance: ignoreSnapshot,
        });
    };

    hookFunction("ChatRoomSyncItem", HookPriority.OBSERVE, (args, next) => {
        next(args);
        const [data] = args as [{ Item?: { Target?: number } }];
        if (getPlayer(data?.Item?.Target)?.IsPlayer()) onMeChanged();
    });

    hookFunction("ChatRoomSyncSingle", HookPriority.OBSERVE, (args, next) => {
        next(args);
        const [data] = args as [{ Character?: { MemberNumber?: number } }];
        if (getPlayer(data?.Character?.MemberNumber)?.IsPlayer()) onMeChanged();
    });

    // Swallow an LSCG spell bounced back at us by a target's aura. Their client
    // re-sends our own spell as a hidden LSCGMsg aimed at us; if it arrives from
    // someone we just acted on, inside the window, it is retaliation and we drop it
    // before LSCG ever sees it.
    hookFunction("ChatRoomMessage", HookPriority.OVERRIDE_BEHAVIOR, (args, next) => {
        const data = args[0];
        if (
            !inIgnoreWindow() ||
            data?.Content !== "LSCGMsg" ||
            typeof data.Sender !== "number" ||
            data.Sender === Player.MemberNumber
        ) return next(args);

        const expiry = recentTargets.get(data.Sender);
        if (!expiry || Date.now() > expiry) return next(args);

        //@ts-expect-error LSCG payload is untyped
        const lscgMessage = data.Dictionary?.[0]?.message;
        if (lscgMessage?.command?.name !== "spell") return next(args);
        if (lscgMessage.target !== undefined && lscgMessage.target !== Player.MemberNumber) return next(args);

        const spell = lscgMessage.command.args?.find((arg) => arg?.name === "spell")?.value;
        if (spell === undefined || isLSCGSpellBeneficial(spell)) return next(args);

        // Drop it. No next(args).
    });
}
