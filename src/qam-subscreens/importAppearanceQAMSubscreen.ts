import { getNickname } from "zois-core";
import { BaseQAMSubscreen } from "./baseQAMSubscreen";
import { toastsManager } from "zois-core/popups";
import { messagesManager } from "zois-core/messaging";
import { getSavedOutfits } from "@/modules/outfitStorage";
import {
  importAppearance,
  serverAppearanceBundleToAppearance,
} from "zois-core/wardrobe";

export class ImportAppearanceQAMSubscreen extends BaseQAMSubscreen {
  public name: string = "Import Appearance";
  public description: string =
    "Import appearance on target using base64 outfit code";

  public load(container: HTMLDivElement) {
    super.load(container);

    let target: Character = Player;
    let selectedOutfit = "";
    const savedOutfits = getSavedOutfits();

    const input = this.buildDropdown<string>({
      currentOption: "",
      options: [
        {
          name: "",
          text: savedOutfits.length
            ? "\u2014 No outfit \u2014"
            : "\u2014 No saved outfits \u2014",
        },
        ...savedOutfits.map((o) => ({ name: o.name, text: o.name })),
      ],
      onChange: (v) => {
        selectedOutfit = v;
      },
    });
    const select = this.buildCharacterSelect((C) => {
      target = C;
    });
    const reaction = this.buildInput("Reaction");
    const btn = this.buildButton("Import Appearance");
    btn.addEventListener("click", () => {
      if (!ServerChatRoomGetAllowItem(Player, target)) {
        return toastsManager.error({
          message: "Interactions are not allowed",
          duration: 3000,
        });
      }
      try {
        const outfit = savedOutfits.find((o) => o.name === selectedOutfit);
        if (!outfit) {
          return toastsManager.error({
            message: "Please select a valid outfit",
            duration: 3000,
          });
        }
        importAppearance(
          target,
          serverAppearanceBundleToAppearance(
            target.AssetFamily,
            JSON.parse(LZString.decompressFromBase64(outfit.code)),
          ),
        );
        const reactionText = reaction.value.trim();
        if (reactionText) {
          messagesManager.sendAction(reactionText);
        }
        toastsManager.success({
          message: `Appearance was successfully imported on ${getNickname(target)}`,
          duration: 4000,
        });
      } catch {
        toastsManager.error({
          title: "Oops!",
          message: "Error occurred while trying to import appearance",
          duration: 5000,
        });
      }
    });
    container.append(input, select, reaction, btn);
  }
}
