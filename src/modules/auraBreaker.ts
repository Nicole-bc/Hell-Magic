import { getPlayer } from "zois-core";
import { hookFunction, HookPriority } from "zois-core/modsApi";
import { modStorage } from "./storage";

// How long after acting on someone we keep undoing retaliation aimed at us.
const IGNORE_WINDOW_MS = 5000;

let ignoreSnapshot: ItemBundle[] | null = null;
let ignoreUntil = 0;

// Reads the target's *synced* aura state. Cross-version safe: every BCC build
// writes the same `BCC` extension key, so `target.BCC` is populated regardless of
// which build the other player runs.
function targetAura(target: Character): NonNullable<typeof modStorage.chaosAura> | undefined {
    const s = target.IsPlayer() ? modStorage : target.BCC;
    return s?.chaosAura;
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
            // it's a harmless no-op. Test in a live room.
            if (modStorage.chaosAura?.disguiseAsSelf) {
                if (type === "ChatRoomCharacterUpdate") {
                    data.SourceMemberNumber = target.MemberNumber;
                } else {
                    data.Source = target.MemberNumber;
                }
            }

            // IGNORE: open an anti-retaliation window vs a shielded target. Runs
            // independently of our own aura, so it protects us even when ours is off.
            if (modStorage.chaosAura?.ignoreEnemyAura && targetAura(target)?.enabled) {
                ignoreSnapshot = ServerAppearanceBundle(Player.Appearance);
                ignoreUntil = Date.now() + IGNORE_WINDOW_MS;
            }
        }

        return next(args);
    });

    // Undo retaliation applied to US during the ignore window.
    const onMeChanged = () => {
        if (!modStorage.chaosAura?.ignoreEnemyAura) return;
        if (!ignoreSnapshot || Date.now() > ignoreUntil) return;
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
}
