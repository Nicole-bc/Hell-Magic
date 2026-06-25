import { version } from "@/../package.json";
import type { MinimumRole, SpellIcon } from "./darkMagic";
import { messagesManager } from "zois-core/messaging";
import type { SyncStorageMessageData } from "@/types/messages";
import { removeQuickMenu } from "./quickAccessMenu";
import { isVersionNewer, waitFor } from "zois-core";
import { toastsManager } from "zois-core/popups";

export let modStorage: ModStorage = { version };

export interface ModStorage {
    // Quick Access Menu
    qam?: {
        enabled?: boolean
        enabledFeatures?: string
        cloneBackup?: {
            nickName: string
            labelColor: `#${string}` | ""
            emoticon: {
                expression: ExpressionName
                color: ItemColor
            },
            blush: {
                expression: ExpressionName
            },
            appearance: string
            activePose: AssetPoseName[]
        }
    },
    overlay?: {
        effectsIcons?: 0 | 1 | 2
        versionText?: 0 | 1 | 2
    }
    chaosAura?: {
        enabled?: boolean
        // When true, the aura behaves like `enabled` with every trigger forced on,
        // and cannot be switched off externally.
        unbreakable?: boolean
        retribution?: boolean
        whiteList?: number[]
        triggers?: {
            itemsChange?: boolean
            clothesChange?: boolean
            magicCast?: boolean
            poseChange?: boolean
        }
        triggersCount?: number
        ignoreItemsChangeIfNotRestraint?: boolean
        // Standalone anti-retribution shield. Works even when the aura is disabled:
        // when you act on someone whose aura is up, retaliation aimed back at you is
        // undone for a few seconds.
        ignoreEnemyAura?: boolean
        // Stamp outgoing changes with the target's own member number as the source,
        // so their aura treats them as self-applied. Only works if the server passes
        // the source field through instead of overwriting it — test in a live room.
        disguiseAsSelf?: boolean
    }
    cheats?: {
        permanentSkillsBoost?: boolean
        autoTight?: boolean
        anonymousMode?: boolean
        allowActivities?: boolean
        mapSuperPower?: boolean
        xray?: boolean
        showPadlocksPasswords?: boolean
        disableArousalOverlay?: boolean
        // Swap a restraint while carrying its lock (code/owner/timer) onto the new item.
        keepLockOnSwap?: boolean
    }
    darkMagic?: {
        spells?: {
            name: string
            icon: SpellIcon
            effects: string
            data?: Record<string, Record<string, unknown>>
            createdBy: {
                name: string
                id: number
            }
        }[]
        limits?: {
            effects?: Record<string, MinimumRole>
        }
        state?: {
            spells?: (ModStorage["darkMagic"]["spells"][0] & { castedBy: { name: string, id: number } })[]
        }
    }
    // Chat-emote triggers: type a matching emote → apply an outfit + send a response emote.
    chatTriggers?: {
        phrase: string
        code: string
        response: string
    }[]
    version: string
}

export function loadStorage(): void {
    if (typeof Player.ExtensionSettings.BCC === "string") {
        modStorage = JSON.parse(LZString.decompressFromBase64(Player.ExtensionSettings.BCC)) ?? { version };
    } else modStorage = { version };
    if (!modStorage.version) modStorage.version = version;
    // Legacy BCC
    if (modStorage.version === "1.8.7") {
        modStorage = { version };
        const legacyData = LZString.decompressFromBase64(Player.ExtensionSettings.BCC);
        waitFor(() => !!document.getElementById("TextAreaChatLog")).then(() => {
            messagesManager.sendLocal("Legacy BCC Data: " + legacyData);
            messagesManager.sendLocal("I get a lot of legacy BCC's error reports, so I decided to release new version sooner than necessary. Most of the functions was migrated, and those that I did not manage to migrate will be added later.");
        });
    }
    if (isVersionNewer(version, modStorage.version)) {
        toastsManager.info({
            title: "BCC was updated",
            message: "You can read the changelog in QAM",
            duration: 6000
        })
        modStorage.version = version;
    }
    syncStorage();
    messagesManager.onPacket("syncStorage", (data: SyncStorageMessageData, sender) => {
        if (!sender.BCC) {
            messagesManager.sendPacket<SyncStorageMessageData>("syncStorage", {
                storage: JSON.parse(JSON.stringify(modStorage)),
            });
        }
        sender.BCC = data.storage;
    });
}

export function syncStorage(): void {
    if (typeof modStorage !== "object") return;
    Player.ExtensionSettings.BCC = LZString.compressToBase64(JSON.stringify(modStorage));
    ServerPlayerExtensionSettingsSync("BCC");
    messagesManager.sendPacket<SyncStorageMessageData>("syncStorage", {
        storage: JSON.parse(JSON.stringify(modStorage)),
    });
}

export function resetStorage(): void {
    removeQuickMenu();
    modStorage = {
        version
    };
    syncStorage();
}