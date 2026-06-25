import { hookFunction, HookPriority } from "zois-core/modsApi";
import { modStorage } from "./storage";

// Property fields that carry a lock's state/secret; copied verbatim to the new item.
const LOCK_PROPERTY_KEYS = [
    "LockedBy", "LockMemberNumber", "Password", "CombinationNumber",
    "LockPickSeed", "RemoveTimer", "MaxTimer", "ShowTimer", "RemoveItem",
    "MemberNumberListKeys", "Hidden"
];

// The item whose lock we've temporarily stripped to allow a swap.
let temp: { C: Character; group: string; item: Item; lock: Record<string, any> } | null = null;

function captureLock(item: Item | null | undefined): Record<string, any> | null {
    if (!item?.Property?.LockedBy) return null;
    const snap: Record<string, any> = {};
    const prop = item.Property as Record<string, any>;
    for (const k of LOCK_PROPERTY_KEYS) {
        if (prop[k] !== undefined) snap[k] = JSON.parse(JSON.stringify(prop[k]));
    }
    return snap;
}

// Write a captured lock back onto an item (the original on abandon, or the new one
// after a swap) and sync it.
function applyLock(C: Character, item: Item, lock: Record<string, any>): void {
    if (!C || !item) return;
    InventoryLock(C, item, lock.LockedBy as string, lock.LockMemberNumber ?? null, false);
    item.Property = { ...(item.Property ?? {}), ...lock };
    CharacterRefresh(C, true, false);
    ChatRoomCharacterUpdate(C);
}

// While a locked item's menu is open, strip its lock LOCALLY (no server push) so the
// change list isn't greyed out. Remembered so we can restore or transfer it.
function stripForSwap(): void {
    if (!modStorage.cheats?.keepLockOnSwap) return;
    const item = DialogFocusItem;
    const C = CharacterGetCurrent();
    const group = item?.Asset?.Group?.Name;
    if (!item || !C || !group || !item.Property?.LockedBy) return;
    if (temp && temp.item === item) return; // already stripped
    const lock = captureLock(item);
    if (!lock) return;
    temp = { C, group, item, lock };
    delete (item.Property as Record<string, any>).LockedBy;
    if (Array.isArray(item.Property.Effect)) {
        item.Property.Effect = item.Property.Effect.filter((e) => e !== "Lock");
    }
    CharacterRefresh(C, false, false); // local only — don't broadcast the unlock
}

// Called when leaving the menu: if the item wasn't swapped, put its lock back.
function finishTemp(): void {
    if (!temp) return;
    const { C, group, item, lock } = temp;
    temp = null;
    const current = InventoryGet(C, group);
    if (current === item && !item.Property?.LockedBy) {
        applyLock(C, item, lock); // not swapped → restore original lock
    }
}

export function loadLockKeeper(): void {
    // Strip the lock right before the item list is built, so it renders un-greyed.
    if (typeof (globalThis as any).DialogInventoryBuild === "function") {
        hookFunction("DialogInventoryBuild", HookPriority.OBSERVE, (args, next) => {
            stripForSwap();
            return next(args);
        });
    }

    // A new item landed in the group → transfer the captured lock to it.
    const onItemSet: Parameters<typeof hookFunction>[2] = (args, next) => {
        const ret = next(args);
        if (temp) {
            const C = args[0] as Character;
            if (C?.MemberNumber === temp.C.MemberNumber) {
                const current = InventoryGet(C, temp.group);
                if (current && current !== temp.item && !current.Property?.LockedBy) {
                    const lock = temp.lock;
                    temp = null;
                    applyLock(C, current, lock);
                    setTimeout(() => {
                        if (current && !current.Property?.LockedBy) applyLock(C, current, lock);
                    }, 150);
                }
            }
        }
        return ret;
    };
    if (typeof (globalThis as any).CharacterAppearanceSetItem === "function") {
        hookFunction("CharacterAppearanceSetItem", HookPriority.OBSERVE, onItemSet);
    }
    hookFunction("InventoryWear", HookPriority.OBSERVE, onItemSet);

    // Leaving the menu without swapping → restore the original lock.
    for (const fn of ["DialogLeaveItemMenu", "DialogLeaveFocusItem", "DialogLeave"]) {
        if (typeof (globalThis as any)[fn] === "function") {
            hookFunction(fn, HookPriority.OBSERVE, (args, next) => {
                finishTemp();
                return next(args);
            });
        }
    }
}
