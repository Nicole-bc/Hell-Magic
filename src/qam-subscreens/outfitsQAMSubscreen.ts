import { toastsManager } from "zois-core/popups";
import { BaseQAMSubscreen } from "./baseQAMSubscreen";
import { applyOutfit, captureCurrentOutfitCode, deleteOutfit, getSavedOutfits, saveOutfit } from "@/modules/outfitStorage";


export class OutfitsQAMSubscreen extends BaseQAMSubscreen {
    public name: string = "Outfits";
    public description: string = "Save outfits in this browser and apply them later";

    private root: HTMLDivElement;

    public load(container: HTMLDivElement) {
        super.load(container);
        this.root = container;
        this.render();
    }

    private render(): void {
        this.root.innerHTML = "";

        this.root.append(this.buildText("Saved outfits (this browser only):"));
        const outfits = getSavedOutfits();
        if (outfits.length === 0) {
            this.root.append(this.buildText("None saved yet."));
        }
        outfits.forEach((o, i) => {
            const row = document.createElement("div");
            row.style.cssText = "display: flex; align-items: center; column-gap: 0.5em; margin: 0.25em 1em;";

            const label = document.createElement("p");
            label.style.cssText = "color: #e7d2c6; font-size: 1.1em; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";
            label.textContent = o.name;

            const applyBtn = this.buildButton("Apply");
            applyBtn.style.margin = "0";
            applyBtn.addEventListener("click", () => {
                try {
                    applyOutfit(o.code);
                    toastsManager.success({ message: `Applied "${o.name}"`, duration: 3000 });
                } catch {
                    toastsManager.error({ message: "Invalid outfit code", duration: 3000 });
                }
            });

            const copyBtn = this.buildButton("Copy code");
            copyBtn.style.margin = "0";
            copyBtn.addEventListener("click", () => {
                navigator.clipboard?.writeText(o.code);
                toastsManager.success({ message: "Code copied", duration: 2000 });
            });

            const delBtn = this.buildButton("Delete");
            delBtn.style.margin = "0";
            delBtn.addEventListener("click", () => {
                deleteOutfit(i);
                this.render();
            });

            row.append(label, applyBtn, copyBtn, delBtn);
            this.root.append(row);
        });

        this.root.append(this.buildText("Save your current look:"));
        const nameInput = this.buildInput("Outfit name");
        const saveBtn = this.buildButton("Save current outfit");
        saveBtn.addEventListener("click", () => {
            const name = nameInput.value.trim();
            if (!name) {
                return toastsManager.error({ message: "Enter a name", duration: 3000 });
            }
            const ok = saveOutfit(name, captureCurrentOutfitCode());
            if (ok) {
                toastsManager.success({ message: `Saved "${name}"`, duration: 3000 });
                this.render();
            } else {
                toastsManager.error({ message: "Could not save (browser storage full?)", duration: 3000 });
            }
        });
        this.root.append(nameInput, saveBtn);
    }
}
