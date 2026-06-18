import { getPlayer } from "zois-core";
import { hookFunction, HookPriority } from "zois-core/modsApi";
import { messagesManager } from "zois-core/messaging";
import { modStorage } from "./storage";
import { suppressChaosAura } from "./chaosAura";

// Wire name for the shatter request. Only HELLFOX/BCC clients that include this
// module will honor it; the current/legacy build has no handler, so against those
// targets only the best-effort snapshot race (below) applies.
const BREAK_AURA_PACKET = "breakAura";

// How long a successfully shattered aura stays down on the target.
const SHATTER_SUPPRESS_MS = 4000;
// How long after acting on someone we keep undoing retaliation aimed at us.
const IGNORE_WINDOW_MS = 5000;
// Re-assert window for the snapshot race; also guards against hook recursion.
const RACE_GUARD_MS = 700;

let raceActiveUntil = 0;
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
    // --- Receiving end of "shatter": another HELLFOX user broke our aura. ---
    // Honored only if our aura is NOT unbreakable (suppressChaosAura no-ops otherwise).
    messagesManager.onPacket(BREAK_AURA_PACKET, (data: { target?: number }) => {
        if (data?.target !== Player.MemberNumber) return;
        if (!modStorage.chaosAura?.enabled) return;
        suppressChaosAura(SHATTER_SUPPRESS_MS);
    });

    // --- Sending end: watch our own outgoing changes to OTHER characters. ---
    hookFunction("ServerSend", HookPriority.OBSERVE, (args, next) => {
        // Skip our own race re-sends so we don't recurse.
        if (Date.now() < raceActiveUntil) return next(args);

        const [type, data] = args as [string, { ID?: number | string }];
        if (
            (type === "ChatRoomCharacterUpdate" || type === "ChatRoomCharacterItemUpdate") &&
            data?.ID != null &&
            data.ID !== Player.OnlineID
        ) {
            const target = resolveTarget(data.ID);
            if (target && !target.IsPlayer()) {
                const aura = targetAura(target);

                // SHATTER: only meaningful against a breakable (non-unbreakable) aura.
                if (modStorage.chaosAura?.shatterEnemyAura && aura?.enabled && !aura?.unbreakable) {
                    // 1) Ask their client to drop its aura (broadcast; only the named
                    //    target acts on it; only newer builds have a handler at all).
                    messagesManager.sendPacket(BREAK_AURA_PACKET, { target: target.MemberNumber });
                    // 2) Best-effort snapshot race vs legacy/current builds: re-assert
                    //    our change a few times to out-run their revert snapshot.
                    raceActiveUntil = Date.now() + RACE_GUARD_MS;
                    const payload = JSON.parse(JSON.stringify(args[1]));
                    for (const delay of [120, 260, 420]) {
                        setTimeout(() => ServerSend(type, payload), delay);
                    }
                }

                // IGNORE: open an anti-retaliation window. Remember how WE look now so
                // we can undo retribution items / a bounce that lands on us shortly after.
                if (modStorage.chaosAura?.ignoreEnemyAura && aura?.enabled) {
                    ignoreSnapshot = ServerAppearanceBundle(Player.Appearance);
                    ignoreUntil = Date.now() + IGNORE_WINDOW_MS;
                }
            }
        }
        return next(args);
    });

    // --- Undo retaliation applied to US during the ignore window. ---
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
