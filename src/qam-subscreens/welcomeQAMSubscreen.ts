import { version } from "@/../package.json";
import { BaseQAMSubscreen } from "./baseQAMSubscreen";


export class WelcomeQAMSubscreen extends BaseQAMSubscreen {
    public name: string = "Welcome";

    public load(container: HTMLDivElement) {
        super.load(container);

        const title = document.createElement("p");
        title.style.cssText = "margin: 0.6em auto 0; text-align: center; font-size: 2.2em; letter-spacing: 0.18em; color: #ff6a2a; text-shadow: 0 0 14px rgba(255, 90, 20, 0.6);";
        title.textContent = "狐火 HELL MAGIC";

        const subtitle = document.createElement("p");
        subtitle.style.cssText = "margin: 0.2em auto 0.4em; text-align: center; font-size: 1.25em; font-style: italic; color: #d8a98f;";
        subtitle.textContent = "Nine tails, nine hells. Welcome back, kitsune.";

        const footer = document.createElement("p");
        footer.style.cssText = "margin: 0.6em auto 0; text-align: center; font-size: 0.95em; color: #7a4a38;";
        footer.textContent = `Hell Magic v${version}`;

        container.append(title, subtitle, footer);
    }
}
