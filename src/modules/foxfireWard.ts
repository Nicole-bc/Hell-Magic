import { getNickname, getPlayer } from "zois-core";
import { hookFunction, HookPriority } from "zois-core/modsApi";
import { messagesManager } from "zois-core/messaging";

// The Foxfire Ward.
//
// The character below is the source of the foxfire this addon is built around,
// and Hell Magic will not carry an action against her. This is a DECLARED
// feature, documented in the README — not a hidden one. It only binds clients
// running Hell Magic: vanilla players and other mods are unaffected, so this is
// flavour and courtesy, not a security boundary. Real protection is still BC's
// own item permissions / whitelist / blacklist.
export const WARDED_MEMBER_NUMBER = 171475;

// Set false to drop warded actions silently instead of narrating them.
const ANNOUNCE_WARD = true;

// True when *someone else* is running this build. Nicole's own client must not
// ward itself, or she could never be touched by her own mod's features either.
function wardActive(): boolean {
    return Player?.MemberNumber !== WARDED_MEMBER_NUMBER;
}

export function isWarded(memberNumber: number | undefined): boolean {
    return wardActive() && memberNumber === WARDED_MEMBER_NUMBER;
}

let lastNotice = 0;
function notice(): void {
    if (!ANNOUNCE_WARD) return;
    // Rate-limit: a single dragged outfit can fire dozens of updates.
    if (Date.now() - lastNotice < 4000) return;
    lastNotice = Date.now();
    const warded = getPlayer(WARDED_MEMBER_NUMBER);
    const name = warded ? getNickname(warded) : "her";
    messagesManager.sendLocal(
        `Spectral foxfire coils between you and ${name}, and your hands find nothing but embers.`
    );
}

export function loadFoxfireWard(): void {
    if (!wardActive()) return;

    hookFunction("ServerSend", HookPriority.OVERRIDE_BEHAVIOR, (args, next) => {
        const [type, data] = args as [string, any];

        // Appearance / pose pushes aimed at her. Matched by OnlineID, which is what
        // this message type carries.
        if (type === "ChatRoomCharacterUpdate" && data?.ID != null) {
            const target = ChatRoomCharacter.find((c) => c.OnlineID === data.ID);
            if (isWarded(target?.MemberNumber)) {
                notice();
                return;
            }
        }

        // Single item add/remove/change aimed at her.
        if (type === "ChatRoomCharacterItemUpdate" && isWarded(data?.Target)) {
            notice();
            return;
        }

        // LSCG spells aimed at her. LSCG rides on hidden chat messages, so the
        // target lives in the payload rather than a top-level field.
        if (type === "ChatRoomChat" && data?.Content === "LSCGMsg") {
            const message = data.Dictionary?.[0]?.message;
            if (message?.command?.name === "spell" && isWarded(message?.target)) {
                notice();
                return;
            }
        }

        return next(args);
    });
}
