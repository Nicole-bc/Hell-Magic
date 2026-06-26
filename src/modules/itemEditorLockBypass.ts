import { hookFunction, HookPriority } from "zois-core/modsApi";

const LOCK_KEYS = [
    "LockedBy", "LockMemberNumber", "Password", "CombinationNumber",
    "LockPickSeed", "RemoveTimer", "MaxTimer", "ShowTimer", "RemoveItem",
    "MemberNumberListKeys", "Hidden"
];

// Lock to restore once the native extended menu is closed.
let pending: { target: Character; group: string; lock: Record<string, any> } | null = null;

export function captureLock(item: Item | null | undefined): Record<string, any> | null {
    if (!item?.Property?.LockedBy) return null;
    const snap: Record<string, any> = {};
    const prop = item.Property as Record<string, any>;
    for (const k of LOCK_KEYS) {
        if (prop[k] !== undefined) snap[k] = JSON.parse(JSON.stringify(prop[k]));
    }
    return snap;
}

export function stripLockLocal(item: Item): void {
    if (!item?.Property) return;
    delete (item.Property as Record<string, any>).LockedBy;
    if (Array.isArray(item.Property.Effect)) {
        item.Property.Effect = item.Property.Effect.filter((e) => e !== "Lock");
    }
}

export function applyLockLocal(item: Item, lock: Record<string, any>): void {
    item.Property = { ...(item.Property ?? {}), ...lock };
}

// Used by the inline editor: strip a lock just long enough to run a synchronous edit.
// Returns the captured lock so the caller can re-apply it afterwards.
export function beginInlineUnlock(item: Item): Record<string, any> | null {
    const lock = captureLock(item);
    if (lock) stripLockLocal(item);
    return lock;
}

// Used by the native menu (interactive): strip now, re-lock automatically on close.
export function beginMenuUnlock(target: Character, item: Item): void {
    const lock = captureLock(item);
    if (!lock) return;
    pending = { target, group: item.Asset.Group.Name, lock };
    stripLockLocal(item);
    CharacterRefresh(target, false, false); // local only — no broadcast
}

function relockPending(): void {
    if (!pending) return;
    const { target, group, lock } = pending;
    pending = null;
    const item = InventoryGet(target, group);
    if (item && !item.Property?.LockedBy) {
        applyLockLocal(item, lock);
        CharacterRefresh(target, true, false);
        ChatRoomCharacterUpdate(target);
    }
}

export function loadItemEditorLockBypass(): void {
    // Re-lock when the player leaves the item/extended menu.
    for (const fn of ["DialogLeaveItemMenu", "DialogLeaveFocusItem", "DialogLeave", "DialogMenuBack"]) {
        if (typeof (globalThis as any)[fn] === "function") {
            hookFunction(fn, HookPriority.OBSERVE, (args, next) => {
                const ret = next(args);
                if (pending) setTimeout(relockPending, 60);
                return ret;
            });
        }
    }
}