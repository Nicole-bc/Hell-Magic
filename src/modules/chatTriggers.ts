import { hookFunction, HookPriority } from "zois-core/modsApi";
import { messagesManager } from "zois-core/messaging";
import { toastsManager } from "zois-core/popups";
import { importAppearance, serverAppearanceBundleToAppearance } from "zois-core/wardrobe";
import { modStorage } from "./storage";

// Guard against re-entrancy: the response emote we send is itself a ChatRoomChat,
// and we don't want it (or the outfit change) to re-trigger the hook.
let firing = false;

// Normalise an emote/phrase for comparison: drop surrounding asterisks, trim, lowercase.
function normalize(s: string | undefined): string {
    return (s ?? "").replace(/^\*+|\*+$/g, "").trim().toLowerCase();
}

function fireTrigger(trigger: { code: string; response: string }): void {
    firing = true;
    try {
        if (trigger.code) {
            try {
                importAppearance(
                    Player,
                    serverAppearanceBundleToAppearance(
                        Player.AssetFamily,
                        JSON.parse(LZString.decompressFromBase64(trigger.code))
                    )
                );
            } catch {
                toastsManager.error({ message: "Chat trigger: invalid outfit code", duration: 3000 });
            }
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
                if (
                    typeof data?.Content === "string" &&
                    (data.Type === "Emote" || data.Type === "Action" || data.Type === "Chat")
                ) {
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
