import { toastsManager } from "zois-core/popups";
import { openItemStudio } from "@/modules/itemStudio";
import { BaseQAMSubscreen } from "./baseQAMSubscreen";


export class ItemStudioQAMSubscreen extends BaseQAMSubscreen {
    public name: string = "Item Studio";
    public description: string = "Build an outfit on a private mannequin, then save it to your Outfits";

    private root: HTMLDivElement;

    public load(container: HTMLDivElement) {
        super.load(container);
        this.root = container;
        this.render();
    }

    private render(): void {
        this.root.innerHTML = "";
        this.root.append(this.buildText("Opens BC's own appearance/extended editor on a private stand-in seeded with your current look \u2014 add, configure and colour anything with no real target and no visual glitches. On accept it saves to your Outfits."));

        const nameInput = this.buildInput("Studio outfit name (optional)");
        const openBtn = this.buildButton("Open Studio");
        openBtn.addEventListener("click", () => {
            try {
                openItemStudio(nameInput.value);
            } catch {
                toastsManager.error({ message: "Couldn't open the studio (try inside a chatroom)", duration: 4000 });
            }
        });
        this.root.append(nameInput, openBtn);
    }
}
