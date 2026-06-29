import { modStorage, syncStorage } from "@/modules/storage";
import { getSavedOutfits } from "@/modules/outfitStorage";
import { toastsManager } from "zois-core/popups";
import { BaseQAMSubscreen } from "./baseQAMSubscreen";


export class ChatTriggersQAMSubscreen extends BaseQAMSubscreen {
    public name: string = "Chat Triggers";
    public description: string = "Type an emote to swap your outfit and send a response emote";

    private root: HTMLDivElement;
    // Index of the trigger currently being edited, or null when adding a new one.
    private editingIndex: number | null = null;

    public load(container: HTMLDivElement) {
        super.load(container);
        this.root = container;
        this.render();
    }

    private render(): void {
        this.root.innerHTML = "";

        const triggers = modStorage.chatTriggers ?? [];
        const editing = this.editingIndex !== null && this.editingIndex < triggers.length
            ? triggers[this.editingIndex]
            : null;
        // If the stored index went stale (e.g. trigger removed elsewhere), reset it.
        if (this.editingIndex !== null && !editing) {
            this.editingIndex = null;
        }

        this.root.append(this.buildText("Your triggers:"));
        if (triggers.length === 0) {
            this.root.append(this.buildText("None yet \u2014 add one below."));
        }
        triggers.forEach((t, i) => {
            const row = document.createElement("div");
            row.style.cssText = "display: flex; align-items: center; justify-content: space-between; column-gap: 0.5em; margin: 0.25em 1em;";

            const label = document.createElement("p");
            label.style.cssText = "color: #e7d2c6; font-size: 1.1em; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";
            label.textContent = (t.phrase || "(no phrase)") + (t.outfit ? `  \u00b7  ${t.outfit}` : (t.code ? "  \u00b7  (code)" : ""));

            const editBtn = this.buildButton(this.editingIndex === i ? "Editing\u2026" : "Edit");
            editBtn.style.margin = "0";
            editBtn.style.flexShrink = "0";
            editBtn.addEventListener("click", () => {
                this.editingIndex = i;
                this.render();
            });

            const removeBtn = this.buildButton("Remove");
            removeBtn.style.margin = "0";
            removeBtn.style.flexShrink = "0";
            removeBtn.addEventListener("click", () => {
                modStorage.chatTriggers?.splice(i, 1);
                // Keep the edit form pointed at the right trigger after a removal.
                if (this.editingIndex === i) {
                    this.editingIndex = null;
                } else if (this.editingIndex !== null && i < this.editingIndex) {
                    this.editingIndex -= 1;
                }
                syncStorage();
                this.render();
            });

            row.append(label, editBtn, removeBtn);
            this.root.append(row);
        });

        this.root.append(this.buildText(editing ? "Edit trigger:" : "Add a trigger:"));
        const phraseInput = this.buildInput("Trigger emote, e.g. *snaps her fingers*");
        if (editing) phraseInput.value = editing.phrase ?? "";

        let selectedOutfit = editing?.outfit ?? "";
        const savedOutfits = getSavedOutfits();
        const outfitDropdown = this.buildDropdown<string>({
            currentOption: selectedOutfit,
            options: [
                { name: "", text: savedOutfits.length ? "\u2014 No outfit \u2014" : "\u2014 No saved outfits \u2014" },
                ...savedOutfits.map((o) => ({ name: o.name, text: o.name }))
            ],
            onChange: (v) => { selectedOutfit = v; }
        });

        const responseInput = this.buildInput("Response emote line");
        if (editing) responseInput.value = editing.response ?? "";

        const submitBtn = this.buildButton(editing ? "Update trigger" : "Add trigger");
        submitBtn.addEventListener("click", () => {
            const phrase = phraseInput.value.trim();
            if (!phrase) {
                return toastsManager.error({ message: "Set a trigger phrase", duration: 3000 });
            }
            modStorage.chatTriggers ??= [];
            // Preserve a legacy raw code only when no outfit is chosen (an outfit
            // takes priority over a code when the trigger fires).
            const keepCode = !selectedOutfit && editing?.code ? editing.code : undefined;
            const newTrigger = {
                phrase,
                response: responseInput.value.trim(),
                outfit: selectedOutfit || undefined,
                code: keepCode
            };
            if (editing && this.editingIndex !== null) {
                modStorage.chatTriggers[this.editingIndex] = newTrigger;
                this.editingIndex = null;
                toastsManager.success({ message: "Trigger updated", duration: 2000 });
            } else {
                modStorage.chatTriggers.push(newTrigger);
            }
            syncStorage();
            this.render();
        });

        this.root.append(phraseInput, outfitDropdown, responseInput, submitBtn);

        if (editing) {
            const cancelBtn = this.buildButton("Cancel edit");
            cancelBtn.addEventListener("click", () => {
                this.editingIndex = null;
                this.render();
            });
            this.root.append(cancelBtn);
        }
    }
}