import { BaseSubscreen } from "zois-core/ui";
import { createElement, SendToBack } from "lucide";
import { MainSubscreen } from "./mainSubscreen";
import { modStorage } from "@/modules/storage";
import { ClickModule } from "zois-core/ui-modules";

export class OverlaySubscreen extends BaseSubscreen {
    get icon(): SVGElement {
        return createElement(SendToBack);
    }

    get name() {
        return "Overlay";
    }

    public load(): void {
        super.load();

        const options = [
            {
                name: "2",
                text: "Always"
            },
            {
                name: "1",
                text: "On Hover"
            },
            {
                name: "0",
                text: "Never"
            }
        ];

        this.createText({
            x: 200,
            y: 220,
            text: "Effects Icons:",
            width: 325
        });

        this.createSelect({
            x: 550,
            y: 220 - 30,
            options,
            width: 500,
            currentOption: (modStorage.overlay?.effectsIcons ?? 2).toString(),
            onChange: (name) => {
                modStorage.overlay ??= {};
                modStorage.overlay.effectsIcons = parseInt(name, 10) as 0 | 1 | 2;
            },
            modules: {
                base: [
                    new ClickModule((target) => {
                        if (target.style.zIndex === "100") target.style.zIndex = "10";
                        else target.style.zIndex = "100";
                    })
                ]
            }
        });
    }

    public exit(): void {
        super.exit();
        this.setSubscreen(new MainSubscreen());
    }
}