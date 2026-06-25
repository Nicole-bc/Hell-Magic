import { importAppearance, serverAppearanceBundleToAppearance } from "zois-core/wardrobe";

// Browser-local store (NOT synced to the BC server). Per-browser/per-device.
const STORAGE_KEY = "HellMagicOutfits";

export interface SavedOutfit {
    name: string;
    code: string;
}

export function getSavedOutfits(): SavedOutfit[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeOutfits(outfits: SavedOutfit[]): boolean {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(outfits));
        return true;
    } catch {
        return false;
    }
}

// Same base64 format the Import Appearance screen consumes, so codes are interchangeable.
export function captureCurrentOutfitCode(): string {
    return LZString.compressToBase64(JSON.stringify(ServerAppearanceBundle(Player.Appearance)));
}

export function saveOutfit(name: string, code: string): boolean {
    const outfits = getSavedOutfits();
    outfits.push({ name, code });
    return writeOutfits(outfits);
}

export function deleteOutfit(index: number): boolean {
    const outfits = getSavedOutfits();
    if (index < 0 || index >= outfits.length) return false;
    outfits.splice(index, 1);
    return writeOutfits(outfits);
}

export function applyOutfit(code: string): void {
    importAppearance(
        Player,
        serverAppearanceBundleToAppearance(Player.AssetFamily, JSON.parse(LZString.decompressFromBase64(code)))
    );
}
