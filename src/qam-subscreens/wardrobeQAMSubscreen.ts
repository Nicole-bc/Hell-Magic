import { toastsManager } from "zois-core/popups";
import { BaseQAMSubscreen } from "./baseQAMSubscreen";


// Hide just the QAM panel (so BC's own screen is visible) WITHOUT removing the floating
// QAM button — clicking the button re-shows the panel as normal.
function hideQAMPanel(): void {
    const panel = document.querySelector<HTMLDivElement>(".bccQAM");
    if (panel) panel.style.display = "none";
}

export class WardrobeQAMSubscreen extends BaseQAMSubscreen {
    public name: string = "Wardrobe";
    public description: string = "Open your character's appearance / wardrobe screen";

    private root: HTMLDivElement;

    public load(container: HTMLDivElement) {
        super.load(container);
        this.root = container;
        this.render();
    }

    private render(): void {
        this.root.innerHTML = "";
        this.root.append(this.buildText("Opens BC's own appearance screen, where you can change your outfit and save/load wardrobe slots."));

        const btn = this.buildButton("Open wardrobe");
        btn.addEventListener("click", () => {
            try {
                hideQAMPanel();
                CharacterAppearanceLoadCharacter(Player);
            } catch {
                toastsManager.error({ message: "Couldn't open the wardrobe (try inside a chatroom)", duration: 4000 });
            }
        });
        this.root.append(btn);
    }
}
