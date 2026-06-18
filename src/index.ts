import "reflect-metadata";
import { injectStyles, MOD_DATA, registerCore, waitForStart } from "zois-core";
import { toastsManager } from "zois-core/popups";
import styles from "./styles.css";
import { version } from "../package.json";
import { loadSettingsSubscreen } from "./modules/settings";
import kitnyx2Font from "./assets/Kitnyx2.ttf";
import { loadCheats } from "./modules/cheats";
import { loadStorage } from "./modules/storage";
import { loadChaosAura } from "./modules/chaosAura";
import { loadAuraBreaker } from "./modules/auraBreaker";
import { loadOverlay } from "./modules/overlay";
import { loadDarkMagic } from "./modules/darkMagic";
import { loadQuickAccessMenu } from "./modules/quickAccessMenu";
import { addActivities } from "./modules/activities";
import { REPOSITORY_URL } from "./constants";
import { MainSubscreen } from "./subscreens/mainSubscreen";
import { OverlaySubscreen } from "./subscreens/overlaySubscreen";
import { QuickAccessMenuSubscreen } from "./subscreens/quickAccessMenuSubscreen";
import { CheatsSubscreen } from "./subscreens/cheatsSubscreen";
import { DarkMagicSubscreen } from "./subscreens/darkMagicSubscreen";
import { ChaosAuraSubscreen } from "./subscreens/chaosAuraSubscreen";
import { AttributionsSubscreen } from "./subscreens/attributionsSubscreen";
import { ResetSettingsSubscreen } from "./subscreens/resetSettingsSubscreen";



function start() {
    registerCore({
        name: "BCC",
        fullName: "Hellfox Chaos",
        repository: REPOSITORY_URL,
        key: "BCC",
        version,
        fontFamily: "Yusei Magic",
        singleToastsTheme: {
            backgroundColor: "#160a06",
            titleColor: "#ff6a2a",
            messageColor: "#d8a98f",
            iconFillColor: "#ff6a2a",
            iconStrokeColor: "#7a1500",
            progressBarColor: "#2a1208"
        },
        deepLinkSubscreens: [
            new MainSubscreen(),
            new OverlaySubscreen(),
            new QuickAccessMenuSubscreen(),
            new CheatsSubscreen(),
            new DarkMagicSubscreen(),
            new ChaosAuraSubscreen(),
            new AttributionsSubscreen(),
            new ResetSettingsSubscreen()
        ]
    });

    injectStyles(`${styles}@font-face { font-family: Kitnyx2; src: url(${kitnyx2Font}); }`);
    loadStorage();
    loadSettingsSubscreen();
    loadCheats();
    loadQuickAccessMenu();
    loadChaosAura();
    loadAuraBreaker();
    loadOverlay();
    loadDarkMagic();
    addActivities();

    toastsManager.success({
        title: `${MOD_DATA.name} loaded`,
        message: `v${version}`,
        duration: 4500
    });
}

waitForStart(start);