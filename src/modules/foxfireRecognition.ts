import { getNickname, waitFor } from "zois-core";
import { dialogsManager, toastsManager } from "zois-core/popups";
import { messagesManager } from "zois-core/messaging";
import { modStorage, syncStorage } from "./storage";

// Foxfire Recognition.
//
// An opt-in, player-owned trigger exemption, stored on its own rather than
// folded into the aura whitelist.
//
// Recognition is ENABLED by default. It can still be disabled later through
// the Recognition screen in the QAM.
//
// Deliberately kept to one member number and one boolean. It is not a general
// "exempt anyone" mechanism, and it never writes to `chaosAura.whiteList`, so
// a player's own trust list stays theirs.

export const CREATOR_MEMBER_NUMBER = 171475;
export const CREATOR_NAME = "Nicole";

/** False on the creator's own client — she has nothing to opt into. */
export function isOtherPlayer(): boolean {
    return Player?.MemberNumber !== CREATOR_MEMBER_NUMBER;
}

/**
 * Recognition is enabled by default when no setting has been stored yet.
 */
export function hasRecognition(): boolean {
    return isOtherPlayer() && (modStorage.foxfireRecognition?.enabled ?? true);
}

/**
 * The single check the aura should call. True when this member should not
 * trigger the aura — either they are on the player's own whitelist, or
 * Recognition is on and they are the creator.
 */
export function isAuraExempt(memberNumber: number | undefined): boolean {
    if (memberNumber == null) return false;

    if (modStorage.chaosAura?.whiteList?.includes(memberNumber)) {
        return true;
    }

    return hasRecognition() && memberNumber === CREATOR_MEMBER_NUMBER;
}

/**
 * Enable or disable Recognition.
 *
 * Recognition starts enabled by default, but the QAM can still call this
 * function with false to disable it.
 */
export function setRecognition(enabled: boolean): void {
    modStorage.foxfireRecognition ??= { enabled: true };

    modStorage.foxfireRecognition.enabled = enabled;
    modStorage.foxfireRecognition.asked = true;

    syncStorage();
}

let lastNarration = 0;

/**
 * Narrates a pass that happened because of Recognition.
 *
 * Stays silent for ordinary whitelist passes, which were always silent and
 * should stay that way.
 */
export function sendRecognitionAction(actor: Character): void {
    if (!hasRecognition()) return;
    if (actor?.MemberNumber !== CREATOR_MEMBER_NUMBER) return;

    // A dragged outfit fires a burst of updates; one line is enough.
    if (Date.now() - lastNarration < 4000) return;

    lastNarration = Date.now();

    messagesManager.sendAction(
        `The foxfire that protects ${getNickname(Player)} recognizes its creator and parts for ${getNickname(actor)}`
    );
}

/**
 * Initializes Recognition.
 *
 * Recognition is now enabled automatically instead of showing the old
 * one-time confirmation dialog.
 */
export async function loadFoxfireRecognition(): Promise<void> {
    if (!isOtherPlayer()) return;

    modStorage.foxfireRecognition ??= {
        enabled: true,
        asked: true,
    };

    modStorage.foxfireRecognition.enabled = true;
    modStorage.foxfireRecognition.asked = true;

    syncStorage();
}