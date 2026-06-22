import { modStorage, syncStorage } from "@/modules/storage";
import { BaseQAMSubscreen } from "./baseQAMSubscreen";


export class LockKeeperQAMSubscreen extends BaseQAMSubscreen {
    public name: string = "Lock Keeper";
    public description: string = "Keep a lock when switching the restraint under it";

    public load(container: HTMLDivElement) {
        super.load(container);

        const keepLockCheckbox = this.buildCheckbox("Keep lock when switching restraint", modStorage.cheats?.keepLockOnSwap, (isChecked) => {
            modStorage.cheats ??= {};
            modStorage.cheats.keepLockOnSwap = isChecked;
            syncStorage();
        });

        const hint = this.buildText("While on, a locked item can be opened and swapped, and the lock (code, owner and timer) is carried onto whatever you put there.");

        container.append(keepLockCheckbox, hint);
    }
}
