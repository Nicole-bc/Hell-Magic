import { modStorage, syncStorage } from "@/modules/storage";
import { toastsManager } from "zois-core/popups";
import { BaseQAMSubscreen } from "./baseQAMSubscreen";


export class ChatTriggersQAMSubscreen extends BaseQAMSubscreen {
    public name: string = "Chat Triggers";
    public description: string = "Type an emote to swap your outfit and send a response emote";

    private root: HTMLDivElement;

    public load(container: HTMLDivElement) {
        super.load(container);
        this.root = container;
        this.render();
    }

    private render(): void {
        this.root.innerHTML = "";

        this.root.append(this.buildText("Your triggers:"));
        const triggers = modStorage.chatTriggers ?? [];
        if (triggers.length === 0) {
            this.root.append(this.buildText("None yet \u2014 add one below."));
        }
        triggers.forEach((t, i) => {
            const row = document.createElement("div");
            row.style.cssText = "display: flex; align-items: center; justify-content: space-between; column-gap: 0.5em; margin: 0.25em 1em;";

            const label = document.createElement("p");
            label.style.cssText = "color: #e7d2c6; font-size: 1.1em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";
            label.textContent = t.phrase || "(no phrase)";

            const removeBtn = this.buildButton("Remove");
            removeBtn.style.margin = "0";
            removeBtn.style.flexShrink = "0";
            removeBtn.addEventListener("click", () => {
                modStorage.chatTriggers?.splice(i, 1);
                syncStorage();
                this.render();
            });

            row.append(label, removeBtn);
            this.root.append(row);
        });

        this.root.append(this.buildText("Add a trigger:"));
        const phraseInput = this.buildInput("Trigger emote, e.g. *snaps her fingers*");
        const codeInput = this.buildInput("Outfit code (base64)");
        const responseInput = this.buildInput("Response emote line");
        const addBtn = this.buildButton("Add trigger");

        addBtn.addEventListener("click", () => {
            const phrase = phraseInput.value.trim();
            if (!phrase) {
                return toastsManager.error({ message: "Set a trigger phrase", duration: 3000 });
            }
            modStorage.chatTriggers ??= [];
            modStorage.chatTriggers.push({
                phrase,
                code: codeInput.value.trim(),
                response: responseInput.value.trim()
            });
            syncStorage();
            this.render();
        });

        this.root.append(phraseInput, codeInput, responseInput, addBtn);
    }
}
