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

function resolveTarget(id: unknown): Character | undefined {
    return ChatRoomCharacter.find(
        (c) => c.OnlineID === id || c.AccountName?.replace("Online-", "") === id
    );
}

export function loadAuraBreaker(): void {
    // Watch our own outgoing changes to OTHER characters. When "ignore enemy aura"
    // is on and the target has an aura up, open a short window during which we undo
    // any retaliation aimed back at us. This runs independently of our own aura, so
    // it protects us from retribution even when our own aura is turned off.
    hookFunction("ServerSend", HookPriority.OBSERVE, (args, next) => {
        const [type, data] = args as [string, { ID?: number | string }];
        if (
            modStorage.chaosAura?.ignoreEnemyAura &&
            (type === "ChatRoomCharacterUpdate" || type === "ChatRoomCharacterItemUpdate") &&
            data?.ID != null &&
            data.ID !== Player.OnlineID
        ) {
            const target = resolveTarget(data.ID);
            if (target && !target.IsPlayer() && targetAura(target)?.enabled) {
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
