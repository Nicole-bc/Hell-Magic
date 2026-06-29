import { toastsManager } from "zois-core/popups";
import { BaseQAMSubscreen } from "./baseQAMSubscreen";


// Every Property field that can carry lock state/secret data.
const LOCK_KEYS = [
    "LockedBy", "LockMemberNumber", "LockMemberName", "Password", "CombinationNumber",
    "LockPickSeed", "RemoveTimer", "MaxTimer", "ShowTimer", "RemoveItem",
    "MemberNumberListKeys", "Hidden"
];

// DOGS records each devious lock in Player.ExtensionSettings.DOGS and re-applies it the
// instant it sees the item unlocked. Delete those records (for the given groups) so it
// has nothing to restore from. Self only — we can't touch another player's storage.
function clearDeviousRecords(groupNames: string[]): void {
    try {
        const raw = (Player.ExtensionSettings as Record<string, any>)?.DOGS;
        if (typeof raw !== "string") return;
        const data = JSON.parse(LZString.decompressFromBase64(raw));
        const groups = data?.deviousPadlock?.itemGroups;
        if (!groups) return;
        let changed = false;
        for (const g of groupNames) {
            if (groups[g]) { delete groups[g]; changed = true; }
        }
        if (changed) {
            (Player.ExtensionSettings as Record<string, any>).DOGS = LZString.compressToBase64(JSON.stringify(data));
            if (typeof ServerPlayerExtensionSettingsSync === "function") {
                ServerPlayerExtensionSettingsSync("DOGS" as keyof ExtensionSettings);
            }
        }
    } catch { /* DOGS not present or unreadable */ }
}

// Strip locks by rewriting the item Property directly (NOT via the unlock action that
// DOGS hooks to block removal), then sync. Works on standard and devious padlocks alike.
function clearAllLocks(C: Character): number {
    let count = 0;
    const clearedGroups: string[] = [];
    for (const item of (C.Appearance ?? [])) {
        const prop = item.Property as Record<string, any> | undefined;
        if (prop?.LockedBy) {
            for (const k of LOCK_KEYS) delete prop[k];
            if (Array.isArray(prop.Effect)) {
                prop.Effect = prop.Effect.filter((e) => e !== "Lock");
            }
            // Drop DOGS's "DeviousPadlock" marker so it doesn't recognise the item.
            if (prop.Name === "DeviousPadlock") delete prop.Name;
            clearedGroups.push(item.Asset.Group.Name);
            count++;
        }
    }
    if (count > 0) {
        // Remove DOGS's stored records first (self only), then sync the stripped item.
        if (C.IsPlayer()) clearDeviousRecords(clearedGroups);
        CharacterRefresh(C, true, false);
        ChatRoomCharacterUpdate(C);
    }
    return count;
}

export class ClearLocksQAMSubscreen extends BaseQAMSubscreen {
    public name: string = "Clear All Locks";
    public description: string = "Strip every lock, including DOGS devious padlocks";

    private root: HTMLDivElement;
    private target: Character = Player;

    public load(container: HTMLDivElement) {
        super.load(container);
        this.root = container;
        this.target = Player;
        this.render();
    }

    private render(): void {
        this.root.innerHTML = "";

        this.root.append(this.buildText("Clear locks on:"));
        this.root.append(this.buildCharacterSelect((C) => {
            this.target = C;
            this.render();
        }, this.target));

        const lockedCount = (this.target.Appearance ?? []).filter((i) => (i.Property as any)?.LockedBy).length;
        this.root.append(this.buildText(
            lockedCount === 0 ? "No locked items found." : `${lockedCount} locked item(s) found.`
        ));

        const clearBtn = this.buildButton("Clear all locks");
        clearBtn.addEventListener("click", () => {
            try {
                const n = clearAllLocks(this.target);
                if (n > 0) {
                    toastsManager.success({ message: `Cleared ${n} lock(s)`, duration: 3000 });
                } else {
                    toastsManager.error({ message: "No locks to clear", duration: 3000 });
                }
                this.render();
            } catch {
                toastsManager.error({ message: "Could not clear locks", duration: 3000 });
            }
        });
        this.root.append(clearBtn);
    }
}