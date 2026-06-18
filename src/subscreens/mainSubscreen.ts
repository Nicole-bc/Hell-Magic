import { BaseSubscreen } from "zois-core/ui";
import { createElement, GitPullRequest, Heart, Trash2 } from "lucide";
import { StyleModule, TypeModule } from "zois-core/ui-modules";
import { version } from "@/../package.json";
import { TentaclesModule } from "@/ui-modules/tentaclesModule";
import { PaintTextModule } from "@/ui-modules/paintTextModule";
import { ChaosAuraSubscreen } from "./chaosAuraSubscreen";
import { OverlaySubscreen } from "./overlaySubscreen";
import { DarkMagicSubscreen } from "./darkMagicSubscreen";
import { QuickAccessMenuSubscreen } from "./quickAccessMenuSubscreen";
import { CheatsSubscreen } from "./cheatsSubscreen";
import { syncStorage } from "@/modules/storage";
import { AttributionsSubscreen } from "./attributionsSubscreen";
import { ResetSettingsSubscreen } from "./resetSettingsSubscreen";
import { getRandomNumber } from "zois-core";


const quotes = [
    "A fox of a thousand years wears the fire of nine hells",
    "Foxfire lights no path but the one you were always going to walk",
    "Hell is not below — it is the flame a kitsune carries between its tails",
    "They mistake the warmth for mercy, until the foxfire is already inside",
    "Nine tails, nine flames, nine ways to undo a binding",
    "What the shadow steals, the foxfire returns threefold",
    "The kitsune does not lie. It simply lets you believe what you wished was true",
    "狐火"
];


export class MainSubscreen extends BaseSubscreen {
    constructor(private readonly animations: boolean = false) {
        super();
    }

    public load(): void {
        super.load();
        this.createCard({
            anchor: "bottom-right",
            x: 90,
            y: 65,
            name: "Version",
            value: version,
            icon: createElement(GitPullRequest),
            modules: this.animations ? {
                value: [
                    new TypeModule({
                        duration: 850
                    })
                ]
            } : undefined
        });

        this.createText({
            text: "HELLFOX CHAOS",
            fontSize: 12,
            x: 150,
            y: 80,
            width: 1600,
            modules: {
                base: [
                    new PaintTextModule(this.animations),
                ]
            }
        });

        this.createText({
            text: quotes[getRandomNumber(0, quotes.length - 1)],
            fontSize: 3,
            x: 800,
            y: 230,
            width: 1000,
            modules: {
                base: [
                    new StyleModule({
                        textAlign: "center",
                        fontWeight: "bold"
                    })
                ]
            }
        });

        [
            new ChaosAuraSubscreen(), new OverlaySubscreen(), new DarkMagicSubscreen(),
            new QuickAccessMenuSubscreen(), new CheatsSubscreen()
        ].forEach((t, i) => {
            this.createButton({
                text: t.name,
                icon: t.icon,
                x: 165,
                y: 280 + (115 * i),
                width: 575,
                padding: 2,
                modules: {
                    base: [
                        new TentaclesModule()
                    ],
                    icon: [
                        new StyleModule({
                            width: "auto",
                            height: "70%"
                        })
                    ]
                },
                onClick: () => this.setSubscreen(t)
            }).style.fontWeight = "bold";
        });

        this.createButton({
            text: "Attributions",
            icon: createElement(Heart),
            x: 1050,
            y: 400,
            width: 485,
            padding: 2,
            onClick: () => this.setSubscreen(new AttributionsSubscreen())
        });

        this.createButton({
            text: "Reset Settings",
            icon: createElement(Trash2),
            x: 1050,
            y: 510,
            style: "inverted",
            width: 485,
            padding: 2,
            onClick: () => this.setSubscreen(new ResetSettingsSubscreen())
        });
    }


    public exit(): void {
        super.exit();
        this.setSubscreen(null);
        syncStorage();
        PreferenceSubscreenExtensionsClear();
    }
}