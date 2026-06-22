import { hookFunction, HookPriority } from "zois-core/modsApi";
import { modStorage } from "./storage";

// Property fields that carry a lock's state/secret; copied verbatim to the new item.
const LOCK_PROPERTY_KEYS = [
    "LockedBy", "LockMemberNumber", "Password", "CombinationNumber",
    "LockPickSeed", "RemoveTimer", "MaxTimer", "ShowTimer", "RemoveItem",
    "MemberNumberListKeys", "Hidden"
];

function captureLock(item: Item | null | undefined): Record<string, any> | null {
    if (!item?.Property?.LockedBy) return null;
    const snap: Record<string, any> = {};
    const prop = item.Property as Record<string, any>;
    for (const k of LOCK_PROPERTY_KEYS) {
        if (prop[k] !== undefined) snap[k] = JSON.parse(JSON.stringify(prop[k]));
    }
    return snap;
}

export function loadLockKeeper(): void {
    // 1) Let the focused locked item be opened for swapping. Normally BC routes a
    //    locked item straight to its unlock screen; reporting "no Lock effect" for
    //    just that one focused item makes the change menu appear instead. Scoped to
    //    the focused item only, so every other lock behaves normally.
    hookFunction("InventoryItemHasEffect", HookPriority.OVERRIDE_BEHAVIOR, (args, next) => {
        const [item, effect] = args as [Item, (string | undefined)?];
        if (
            modStorage.cheats?.keepLockOnSwap &&
            effect === "Lock" &&
            item != null &&
            item === DialogFocusItem
        ) {
            return false;
        }
        return next(args);
    });

    // 2) When an item replaces a locked one in the same group, carry the lock over.
    hookFunction("InventoryWear", HookPriority.OBSERVE, (args, next) => {
        if (!modStorage.cheats?.keepLockOnSwap) return next(args);

        const C = args[0] as Character;
        const groupName = args[2] as string;
        if (!C || !groupName) return next(args);

        // Snapshot the lock on the item currently in that group (before it's replaced).
        const prevLock = captureLock(InventoryGet(C, groupName));

        const ret = next(args);

        if (prevLock?.LockedBy) {
            const newItem = InventoryGet(C, groupName);
            if (newItem && !InventoryGetLock(newItem)) {
                // Re-establish the lock proper, then overlay the captured secret/state.
                InventoryLock(C, newItem, prevLock.LockedBy as string, prevLock.LockMemberNumber ?? null, false);
                newItem.Property = { ...(newItem.Property ?? {}), ...prevLock };
                CharacterRefresh(C, true, false);
                ChatRoomCharacterUpdate(C);
            }
        }

        return ret;
    });
}
