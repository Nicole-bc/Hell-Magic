import { hookFunction, HookPriority } from "zois-core/modsApi";
import { messagesManager } from "zois-core/messaging";
import { toastsManager } from "zois-core/popups";
import { modStorage } from "./storage";
import { applyOutfit, getSavedOutfits } from "./outfitStorage";

// Guard against re-entrancy: the response emote we send is itself a ChatRoomChat,
// and we don't want it (or the outfit change) to re-trigger the hook.
let firing = false;

// Normalise an emote/phrase for comparison: drop surrounding asterisks, trim, lowercase.
function normalize(s: string | undefined): string {
    return (s ?? "").replace(/^\*+|\*+$/g, "").trim().toLowerCase();
}

function fireTrigger(trigger: { outfit?: string; code?: string; response: string }): void {
    firing = true;
    try {
        // Resolve the outfit: a saved-library name takes priority, else a raw code.
        let code = trigger.code;
        if (trigger.outfit) {
            code = getSavedOutfits().find((o) => o.name === trigger.outfit)?.code;
        }
        if (code) {
            try {
                applyOutfit(code);
            } catch {
                toastsManager.error({ message: "Chat trigger: invalid outfit code", duration: 3000 });
            }
        } else if (trigger.outfit) {
            toastsManager.error({ message: `Chat trigger: outfit "${trigger.outfit}" not found`, duration: 3000 });
        }
        if (trigger.response) {
            messagesManager.sendAction(trigger.response);
        }
    } finally {
        // Reset after the current call stack (which includes the response send) clears.
        setTimeout(() => { firing = false; }, 0);
    }
}

export function loadChatTriggers(): void {
    hookFunction("ServerSend", HookPriority.OBSERVE, (args, next) => {
        const ret = next(args);
        try {
            if (!firing && args[0] === "ChatRoomChat") {
                const data = args[1] as { Content?: string; Type?: string };
                const raw = typeof data?.Content === "string" ? data.Content.trim() : "";
                // Only react to action/emote messages (the *...* kind, sent as type
                // "Emote"), never to normal chat. The asterisk check is a fallback in
                // case an emote arrives typed as plain text.
                const isEmote = data?.Type === "Emote" || (raw.startsWith("*") && raw.endsWith("*"));
                if (raw && isEmote) {
                    const content = normalize(data.Content);
                    const triggers = modStorage.chatTriggers ?? [];
                    for (const t of triggers) {
                        const phrase = normalize(t.phrase);
                        if (phrase && content.includes(phrase)) {
                            fireTrigger(t);
                            break; // one trigger per message
                        }
                    }
                }
            }
        } catch { /* never break chat sending */ }
        return ret;
    });
}
