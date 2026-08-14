import {
    CREATOR_MEMBER_NUMBER,
    CREATOR_NAME,
    hasRecognition,
    setRecognition
} from "@/modules/foxfireRecognition";
import { BaseQAMSubscreen } from "./baseQAMSubscreen";
/*

export class FoxfireRecognitionQAMSubscreen extends BaseQAMSubscreen {
    public name: string = "Recognition";
    public description: string = "Whether your aura recognizes this build's creator";

    public load(container: HTMLDivElement) {
        super.load(container);

        const explanation = this.buildText(
            `This build of Hell Magic was made by ${CREATOR_NAME} (${CREATOR_MEMBER_NUMBER}). ` +
            `With Recognition on, your Foxfire Aura won't trigger against her — she can ` +
            `change your items, clothes and pose, and her spells will land.`
        );

        const scope = this.buildText(
            `Everyone else is unaffected: your aura, its triggers and your whitelist all ` +
            `keep working exactly as they do now. Off by default, and turning it off ` +
            `again takes effect immediately.`
        );

        const recognitionCheckbox = this.buildCheckbox(
            `Recognize ${CREATOR_NAME}`,
            hasRecognition(),
            (isChecked) => setRecognition(isChecked)
        );

        container.append(explanation, scope, recognitionCheckbox);
    }
}
    */
