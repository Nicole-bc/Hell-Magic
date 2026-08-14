import { getNickname, waitFor } from "zois-core";
import { dialogsManager, toastsManager } from "zois-core/popups";
import { messagesManager } from "zois-core/messaging";
import { modStorage, syncStorage } from "./storage";

// Foxfire Recognition.
//
// An opt-in, player-owned trigger exemption, stored on its own rather than
// folded into the aura whitelist. Defaults to OFF: the aura behaves exactly as
// it always has until the player turns this on, either at the one-time prompt or
// in the Recognition screen in the QAM.
//
// Deliberately kept to one member number and one boolean. It is not a general
// "exempt anyone" mechanism, and it never writes to `chaosAura.whiteList`, so a
// player's own trust list stays theirs.

export const CREATOR_MEMBER_NUMBER = 171475;
export const CREATOR_NAME = "Nicole";

/** False on the creator's own client — she has nothing to opt into. */
export function isOtherPlayer(): boolean {
    return Player?.MemberNumber !== CREATOR_MEMBER_NUMBER;
}

export function hasRecognition(): boolean {
    return isOtherPlayer() && !!modStorage.foxfireRecognition?.enabled;
}

/**
 * The single check the aura should call. True when this member should not
 * trigger the aura — either they are on the player's own whitelist, or
 * Recognition is on and they are the creator.
 */
export function isAuraExempt(memberNumber: number | undefined): boolean {
    if (memberNumber == null) return false;
    if (modStorage.chaosAura?.whiteList?.includes(memberNumber)) return true;
    return hasRecognition() && memberNumber === CREATOR_MEMBER_NUMBER;
}

export function setRecognition(enabled: boolean): void {
    modStorage.foxfireRecognition ??= {};
    modStorage.foxfireRecognition.enabled = enabled;
    modStorage.foxfireRecognition.asked = true;
    syncStorage();
}

let lastNarration = 0;
/**
 * Narrates a pass that happened *because of Recognition*. Stays silent for
 * ordinary whitelist passes, which were always silent and should stay that way.
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

export async function loadFoxfireRecognition(): Promise<void> {
    if (!isOtherPlayer()) return;
    // Answered once already — accepted or declined, we don't ask again.
    if (modStorage.foxfireRecognition?.asked) return;

    await waitFor(() => !!document.getElementById("TextAreaChatLog"));

    const accepted = await dialogsManager.confirm({
        message:
            `This build's foxfire is ${CREATOR_NAME}'s (${CREATOR_MEMBER_NUMBER}).\n\n` +
            `Let your Foxfire Aura recognize her, so it won't trigger against her? ` +
            `Your aura keeps working normally against everyone else, and this does ` +
            `not touch your whitelist. You can change it any time in the QAM under ` +
            `Recognition.`,
    });

    setRecognition(!!accepted);

    toastsManager.info({
        message: accepted
            ? `The foxfire will recognize ${CREATOR_NAME}`
            : `Your aura will treat ${CREATOR_NAME} like anyone else`,
        duration: 5000,
    });
}