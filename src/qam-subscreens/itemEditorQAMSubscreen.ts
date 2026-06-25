import { getNickname } from "zois-core";
import { toastsManager } from "zois-core/popups";
import { removeQuickMenu } from "@/modules/quickAccessMenu";
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

        // Extended "mode" — typed items like earphones (noise-cancelling), gags, blindfolds.
        const typedOptions = (TypedItemGetOptions(item.Asset.Group.Name, item.Asset.Name) ?? null) as
            ({ Name: string; Property?: { Type?: string | null } }[] | null);
        const currentType = item.Property?.Type ?? null;
        let selectedMode = typedOptions?.find((o) => (o.Property?.Type ?? null) === currentType)?.Name ?? "";
        if (typedOptions?.length) {
            this.root.append(this.buildText("Mode:"));
            this.root.append(this.buildDropdown<string>({
                currentOption: selectedMode || typedOptions[0].Name,
                options: typedOptions.map((o) => ({ name: o.Name, text: o.Name })),
                onChange: (v) => { selectedMode = v; }
            }));
        }

        this.root.append(nameInput, descInput);

        const saveBtn = this.buildButton("Save");
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

            const hasCraftEdits =
                !!descInput.value.trim() ||
                !!selectedEffect ||
                (nameInput.value.trim() !== "" && nameInput.value.trim() !== fresh.Asset.Description);
            const applyCraft = hasCraftEdits || !!fresh.Craft;

            try {
                if (applyCraft) {
                    if (CraftingValidate(craft, fresh.Asset) === CraftingStatusType.CRITICAL_ERROR) {
                        return toastsManager.error({ message: "That effect isn't valid for this item", duration: 3000 });
                    }
                    InventoryCraft(Player, Player, this.selectedGroup as AssetGroupItemName, craft, true);
                }
                if (typedOptions?.length && selectedMode) {
                    TypedItemSetOptionByName(Player, fresh, selectedMode, false, null, true);
                }
                ChatRoomCharacterUpdate(Player);
                toastsManager.success({ message: "Item updated", duration: 3000 });
                this.render();
            } catch {
                toastsManager.error({ message: "Could not apply the changes", duration: 3000 });
            }
        });
        this.root.append(saveBtn);

        // For complex items (modular chastity belts, vibrators, etc.) hand off to BC's
        // own extended-item screen — it already knows how to configure every archetype.
        if (item.Asset.Extended) {
            const fullBtn = this.buildButton("Open full config menu");
            fullBtn.addEventListener("click", () => {
                const it = InventoryGet(Player, this.selectedGroup);
                if (!it) {
                    return toastsManager.error({ message: "Item no longer worn", duration: 3000 });
                }
                try {
                    removeQuickMenu();
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