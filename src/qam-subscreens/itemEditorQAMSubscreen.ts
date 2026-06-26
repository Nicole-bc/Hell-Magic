import { getNickname } from "zois-core";
import { toastsManager } from "zois-core/popups";
import { applyLockLocal, beginInlineUnlock, beginMenuUnlock } from "@/modules/itemEditorLockBypass";
import { BaseQAMSubscreen } from "./baseQAMSubscreen";


// Crafting preset effects available for a given asset (only the ones it allows).
function allowedEffects(asset: Asset): CraftingPropertyType[] {
    const result: CraftingPropertyType[] = [];
    try {
        for (const [prop, allow] of CraftingPropertyMap.entries()) {
            try {
                if (allow(asset)) result.push(prop);
            } catch { /* skip props that throw on this asset */ }
        }
    } catch { /* CraftingPropertyMap unavailable */ }
    return result;
}

function currentEffectOf(item: Item): string {
    const craft = item.Craft;
    if (craft?.Effects && Object.keys(craft.Effects).length) return Object.keys(craft.Effects)[0];
    return (craft?.Property as string) ?? "";
}

// Hide just the QAM panel (so BC's native dialog is visible) WITHOUT removing the
// floating QAM button — clicking the button re-shows the panel as normal.
function hideQAMPanel(): void {
    const panel = document.querySelector<HTMLDivElement>(".bccQAM");
    if (panel) panel.style.display = "none";
}

export class ItemEditorQAMSubscreen extends BaseQAMSubscreen {
    public name: string = "Item Editor";
    public description: string = "Edit a worn restraint's name, description and crafted effect";

    private root: HTMLDivElement;
    private target: Character = Player;
    private selectedGroup: string = "";

    public load(container: HTMLDivElement) {
        super.load(container);
        this.root = container;
        this.target = Player;
        this.render();
    }

    private wornRestraints(): Item[] {
        return (this.target.Appearance ?? []).filter((i) => i.Asset?.Group?.Category === "Item");
    }

    private render(): void {
        this.root.innerHTML = "";

        // Whose items to edit (self, or anyone in the room).
        this.root.append(this.buildText("Edit items on:"));
        this.root.append(this.buildCharacterSelect((C) => {
            this.target = C;
            this.selectedGroup = "";
            this.render();
        }, this.target));

        const worn = this.wornRestraints();
        if (worn.length === 0) {
            this.root.append(this.buildText(
                this.target.IsPlayer() ? "You aren't wearing any restraints to edit." : "They aren't wearing any restraints to edit."
            ));
            return;
        }

        // Keep selection valid.
        if (!worn.some((i) => i.Asset.Group.Name === this.selectedGroup)) {
            this.selectedGroup = worn[0].Asset.Group.Name;
        }

        this.root.append(this.buildText("Restraint to edit:"));
        this.root.append(this.buildDropdown<string>({
            currentOption: this.selectedGroup,
            options: worn.map((i) => ({ name: i.Asset.Group.Name, text: i.Asset.Description })),
            onChange: (v) => { this.selectedGroup = v; this.render(); }
        }));

        const item = InventoryGet(this.target, this.selectedGroup);
        if (!item) {
            this.root.append(this.buildText("Could not read that item."));
            return;
        }

        const nameInput = this.buildInput("Item name");
        nameInput.value = item.Craft?.Name ?? item.Asset.Description;

        const descInput = this.buildInput("Description text");
        descInput.value = item.Craft?.Description ?? "";

        let selectedEffect = currentEffectOf(item);
        const effects = allowedEffects(item.Asset);
        this.root.append(this.buildText("Crafted effect:"));
        this.root.append(this.buildDropdown<string>({
            currentOption: selectedEffect,
            options: [
                { name: "", text: "\u2014 None \u2014" },
                ...effects.map((e) => ({ name: e, text: e }))
            ],
            onChange: (v) => { selectedEffect = v; }
        }));

        this.root.append(nameInput, descInput);

        const saveBtn = this.buildButton("Save name / description / effect");
        saveBtn.addEventListener("click", () => {
            const target = this.target;
            const fresh = InventoryGet(target, this.selectedGroup);
            if (!fresh) {
                return toastsManager.error({ message: "Item no longer worn", duration: 3000 });
            }
            const base = (fresh.Craft ?? {}) as Partial<CraftingItem>;
            const craft: CraftingItem = {
                Item: fresh.Asset.Name,
                Name: nameInput.value.trim() || fresh.Asset.Description,
                Description: descInput.value.trim(),
                Effects: selectedEffect ? { [selectedEffect]: 1 } as Partial<Record<CraftingPropertyType, number>> : {},
                Color: typeof fresh.Color === "string" ? fresh.Color : (base.Color ?? "Default"),
                Lock: base.Lock ?? "",
                Private: base.Private ?? false,
                ItemProperty: base.ItemProperty ?? null,
                TypeRecord: fresh.Property?.TypeRecord ?? base.TypeRecord ?? null,
                MemberNumber: Player.MemberNumber,
                MemberName: getNickname(Player)
            };

            if (CraftingValidate(craft, fresh.Asset) === CraftingStatusType.CRITICAL_ERROR) {
                return toastsManager.error({ message: "That effect isn't valid for this item", duration: 3000 });
            }

            try {
                // If the item is locked, drop the lock locally just long enough to apply
                // the craft, then put it straight back so it stays locked.
                const heldLock = beginInlineUnlock(fresh);
                // PreConfigureItem = false keeps the item's current extended type intact.
                InventoryCraft(Player, target, this.selectedGroup as AssetGroupItemName, craft, true, false, false);
                if (heldLock) {
                    const after = InventoryGet(target, this.selectedGroup);
                    if (after && !after.Property?.LockedBy) applyLockLocal(after, heldLock);
                }
                ChatRoomCharacterUpdate(target);
                toastsManager.success({ message: "Item updated", duration: 3000 });
                this.render();
            } catch {
                toastsManager.error({ message: "Could not apply the changes", duration: 3000 });
            }
        });
        this.root.append(saveBtn);

        // Types / modes (earphones noise-cancelling, gag levels, modular chastity belts,
        // vibrators, etc.) are configured through BC's own extended-item screen, which
        // handles every archetype correctly.
        if (item.Asset.Extended) {
            const fullBtn = this.buildButton("Open type / mode menu");
            fullBtn.addEventListener("click", () => {
                const target = this.target;
                const it = InventoryGet(target, this.selectedGroup);
                if (!it) {
                    return toastsManager.error({ message: "Item no longer worn", duration: 3000 });
                }
                try {
                    // Unlock locally so BC opens the config screen instead of the unlock
                    // screen; the lock is restored automatically when the menu closes.
                    beginMenuUnlock(target, it);
                    hideQAMPanel();
                    CharacterSetCurrent(target);
                    DialogFocusItem = it;
                    DialogFocusSourceItem = null;
                    DialogExtendItem(it);
                } catch {
                    toastsManager.error({ message: "Couldn't open the menu (try inside a chatroom)", duration: 4000 });
                }
            });
            this.root.append(fullBtn);
        }
    }
}