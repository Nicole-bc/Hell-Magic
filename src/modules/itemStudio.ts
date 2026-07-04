import { serverAppearanceBundleToAppearance } from "zois-core/wardrobe";
import { toastsManager } from "zois-core/popups";
import { saveOutfit } from "./outfitStorage";

// A private, non-networked "mannequin" character to build/configure items on, so nothing
// touches a real player. Inspired by the mannequin technique, implemented from scratch.
let mannequin: Character | null = null;

function cleanupStudio(): void {
    if (mannequin) {
        try {
            if (typeof CharacterDelete === "function") CharacterDelete(mannequin);
        } catch { /* ignore */ }
        mannequin = null;
    }
}

// Open BC's own appearance/extended editor on a fresh mannequin seeded with your current
// look. When you accept, the built outfit is saved to your Outfits library.
export function openItemStudio(outfitName: string): void {
    cleanupStudio();

    mannequin = CharacterLoadSimple("HellMagicStudio");
    // Seed with your full current appearance (body + clothes + items) so you build from
    // your own look rather than a blank slate.
    try {
        mannequin.Appearance = serverAppearanceBundleToAppearance(
            mannequin.AssetFamily,
            ServerAppearanceBundle(Player.Appearance)
        );
        CharacterRefresh(mannequin, false, false);
    } catch { /* seeding is best-effort */ }

    CharacterAppearanceLoadCharacter(mannequin, (accept: boolean) => {
        try {
            if (accept && mannequin) {
                const code = LZString.compressToBase64(
                    JSON.stringify(ServerAppearanceBundle(mannequin.Appearance))
                );
                const name = outfitName?.trim() || `Studio ${new Date().toLocaleDateString()}`;
                if (saveOutfit(name, code)) {
                    toastsManager.success({ message: `Saved "${name}" to Outfits`, duration: 4000 });
                } else {
                    toastsManager.error({ message: "Couldn't save the studio outfit", duration: 4000 });
                }
            }
        } finally {
            cleanupStudio();
        }
    });
}
