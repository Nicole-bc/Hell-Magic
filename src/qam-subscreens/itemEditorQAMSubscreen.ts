import { getNickname } from "zois-core";
import { toastsManager } from "zois-core/popups";
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
    private selectedGroup: string = "";

    public load(container: HTMLDivElement) {
        super.load(container);
        this.root = container;
        this.render();
    }

    private wornRestraints(): Item[] {
        return (Player.Appearance ?? []).filter((i) => i.Asset?.Group?.Category === "Item");
    }

    private render(): void {
        this.root.innerHTML = "";

        const worn = this.wornRestraints();
        if (worn.length === 0) {
            this.root.append(this.buildText("You aren't wearing any restraints to edit."));
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

        const item = InventoryGet(Player, this.selectedGroup);
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
            const fresh = InventoryGet(Player, this.selectedGroup);
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
                // PreConfigureItem = false keeps the item's current extended type intact.
                InventoryCraft(Player, Player, this.selectedGroup as AssetGroupItemName, craft, true, false, false);
                ChatRoomCharacterUpdate(Player);
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
                const it = InventoryGet(Player, this.selectedGroup);
                if (!it) {
                    return toastsManager.error({ message: "Item no longer worn", duration: 3000 });
                }
                try {
                    hideQAMPanel();
                    CharacterSetCurrent(Player);
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