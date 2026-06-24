import { hookFunction, HookPriority } from "zois-core/modsApi";
import { modStorage } from "./storage";

// Property fields that carry a lock's state/secret; copied verbatim to the new item.
const LOCK_PROPERTY_KEYS = [
    "LockedBy", "LockMemberNumber", "Password", "CombinationNumber",
    "LockPickSeed", "RemoveTimer", "MaxTimer", "ShowTimer", "RemoveItem",
    "MemberNumberListKeys", "Hidden"
];

// The lock we captured off a locked item the moment it was opened for swapping.
let pending: { member: number; group: string; lock: Record<string, any>; until: number } | null = null;

function captureLock(item: Item | null | undefined): Record<string, any> | null {
    if (!item?.Property?.LockedBy) return null;
    const snap: Record<string, any> = {};
    const prop = item.Property as Record<string, any>;
    for (const k of LOCK_PROPERTY_KEYS) {
        if (prop[k] !== undefined) snap[k] = JSON.parse(JSON.stringify(prop[k]));
    }
    return snap;
}

// Re-apply the captured lock to whatever item now sits in that group.
function relock(C: Character, p: { member: number; group: string; lock: Record<string, any> }): void {
    if (!C || C.MemberNumber !== p.member) return;
    const item = InventoryGet(C, p.group);
    if (!item || item.Property?.LockedBy) return; // group empty, or already locked
    InventoryLock(C, item, p.lock.LockedBy as string, p.lock.LockMemberNumber ?? null, false);
    item.Property = { ...(item.Property ?? {}), ...p.lock };
    CharacterRefresh(C, true, false);
    ChatRoomCharacterUpdate(C);
}

export function loadLockKeeper(): void {
    // True only for the single item you're currently looking at, while the toggle is on.
    const isFocused = (item: Item | null | undefined): boolean =>
        !!modStorage.cheats?.keepLockOnSwap && item != null && item === DialogFocusItem;

    // 1) Open a locked item for swapping. BC decides "this is locked, show the unlock
    //    screen" via one of several lock checks, so we neutralise all of them for the
    //    focused item only — and capture the lock here while it's still intact.
    const captureFromFocus = (item: Item): void => {
        const C = CharacterGetCurrent();
        const group = item.Asset?.Group?.Name;
        const lock = captureLock(item);
        if (C && group && lock) {
            pending = { member: C.MemberNumber, group, lock, until: Date.now() + 30000 };
        }
    };

    hookFunction("InventoryItemHasEffect", HookPriority.OVERRIDE_BEHAVIOR, (args, next) => {
        const [item, effect] = args as [Item, (string | undefined)?];
        if (effect === "Lock" && isFocused(item)) {
            captureFromFocus(item);
            return false;
        }
        return next(args);
    });

    hookFunction("InventoryGetLock", HookPriority.OVERRIDE_BEHAVIOR, (args, next) => {
        const [item] = args as [Item];
        if (isFocused(item)) {
            captureFromFocus(item);
            return null;
        }
        return next(args);
    });

    if (typeof (globalThis as any).InventoryItemHasLock === "function") {
        hookFunction("InventoryItemHasLock", HookPriority.OVERRIDE_BEHAVIOR, (args, next) => {
            const [item] = args as [Item];
            if (isFocused(item)) {
                captureFromFocus(item);
                return false;
            }
            return next(args);
        });
    }

    // 2) Once a new item lands in that group, re-apply the captured lock. Hooked at the
    //    lowest common point (CharacterAppearanceSetItem) plus InventoryWear, with a
    //    deferred re-assert to survive the dialog's own follow-up sync.
    const restore: Parameters<typeof hookFunction>[2] = (args, next) => {
        const ret = next(args);
        if (modStorage.cheats?.keepLockOnSwap && pending && Date.now() <= pending.until) {
            const C = args[0] as Character;
            if (C?.MemberNumber === pending.member) {
                const p = pending;
                pending = null;
                relock(C, p);
                setTimeout(() => relock(C, p), 150);
            }
        }
        return ret;
    };

    if (typeof (globalThis as any).CharacterAppearanceSetItem === "function") {
        hookFunction("CharacterAppearanceSetItem", HookPriority.OBSERVE, restore);
    }
    hookFunction("InventoryWear", HookPriority.OBSERVE, restore);
}
