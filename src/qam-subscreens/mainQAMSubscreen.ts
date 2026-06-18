import { qamFeatures, isFeatureEnabled, type QAMFeature, serverPing, QAMWindow } from "@/modules/quickAccessMenu";
import { MainSubscreen } from "@/subscreens/mainSubscreen";
import { AlignVerticalSpaceAround, createElement, Maximize, Settings, SidebarClose, X } from "lucide";
import { MOD_DATA } from "zois-core";
import { addDynamicClass, type DynamicClassStyles, setSubscreen } from "zois-core/ui";
import { BaseQAMSubscreen } from "./baseQAMSubscreen";
import { WelcomeQAMSubscreen } from "./welcomeQAMSubscreen";


function getServer() {
    if (window.location.host === "www.bondageprojects.elementfx.com") return "America";
    if (window.location.host === "www.bondage-europe.com") return "Europe";
    if (window.location.host === "www.bondage-asia.com") return "Asia";
    return "Not defined";
}

export class MainQAMSubscreen extends BaseQAMSubscreen {
    public name: string = "HELLFOX CHAOS";

    public load(container: HTMLElement) {
        const header = document.createElement("div");
        header.style.cssText = "cursor: grab; user-select: none; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #7a1f14; background: rgba(20, 6, 8, 0.92); padding: 0 0.15em;";

        const headerLeftButtonsContainer = document.createElement("div");
        const headerRightButtonsContainer = document.createElement("div");
        const _ = "display: flex; align-items: center; column-gap: 0.2em;";
        headerLeftButtonsContainer.style.cssText = _;
        headerRightButtonsContainer.style.cssText = _;

        const headerButtonStyle: DynamicClassStyles = {
            base: {
                flexShrink: "0",
                width: "2em",
                height: "2em",
                cursor: "pointer",
                padding: "0.25em",
                color: "#d4af37",
                borderRadius: "4px"
            },
            hover: {
                background: "rgba(94, 11, 20, 0.45)"
            }
        };

        const minimizeSidebarButton = createElement(SidebarClose);
        addDynamicClass(minimizeSidebarButton, headerButtonStyle);
        minimizeSidebarButton.addEventListener("click", () => {
            document.getElementsByClassName("bccQAM_sidebar")[0].toggleAttribute("data-minimized");
        });

        const centerQAMButton = createElement(AlignVerticalSpaceAround);
        addDynamicClass(centerQAMButton, headerButtonStyle);
        centerQAMButton.addEventListener("click", () => {
            container.style.left = ((window.innerWidth - container.offsetWidth) / 2) + "px";
            container.style.top = ((window.innerHeight - container.offsetHeight) / 2) + "px";
        });

        const maximizeQAMButton = createElement(Maximize);
        addDynamicClass(maximizeQAMButton, headerButtonStyle);
        maximizeQAMButton.addEventListener("click", () => {
            container.style.width = "95%";
            container.style.height = "80%";
        });

        const closeQAMButton = createElement(X);
        addDynamicClass(closeQAMButton, headerButtonStyle);
        closeQAMButton.addEventListener("click", () => {
            (document.getElementsByClassName("bccQAM") as HTMLCollectionOf<HTMLDivElement>)[0].style.display = "none";
        });

        headerLeftButtonsContainer.append(minimizeSidebarButton);
        headerRightButtonsContainer.append(centerQAMButton, maximizeQAMButton, closeQAMButton);

        const title = document.createElement("p");
        title.textContent = this.name;
        title.style.cssText = "font-weight: bold; padding: 0.25em 1em; text-align: center; font-size: clamp(10px, 5vw, 24px); width: 100%; letter-spacing: 0.08em;";
        title.style.textShadow = "rgb(140, 14, 20) -0.095em -0.05em 0px";
        title.style.letterSpacing = "0.05em";
        title.style.fontFamily = "Finger Paint";
        title.style.color = "#e8c46a";

        const sidebar = document.createElement("div");
        sidebar.classList.add("bccQAM_sidebar");
        sidebar.style.cssText = "display: flex; flex-direction: column; width: 40%; height: 100%;";

        const contentArea = document.createElement("div");
        contentArea.style.cssText = "width: 100%; display: flex; flex-direction: column; margin: 0 auto; padding-bottom: 0.5em; border-left: 1px solid #5e0b14;";

        const contentAreaHeader = document.createElement("div");
        contentAreaHeader.style.cssText = "display: flex; flex-direction: column; row-gap: 0.65em; padding: 0.65em; border-bottom: 1px solid #5e0b14; margin-bottom: 0.5em;";

        const contentAreaHeaderTitle = document.createElement("p");
        contentAreaHeaderTitle.style.cssText = "font-weight: bold; font-size: 1.15em; color: #e8c46a;";

        const contentAreaHeaderDescription = document.createElement("p");
        contentAreaHeaderDescription.style.cssText = "color: #a98a78; font-size: 0.75em;";

        const featureContent = document.createElement("div");
        featureContent.style.cssText = "display: flex; flex-direction: column; height: 100%; overflow: auto;";

        const searchInput = document.createElement("input");
        searchInput.style.cssText = "border: none !important; outline: none !important; background: none; width: 100%; padding: 0.65em; margin: 0.25em 0; color: #e7d2c6;";
        searchInput.placeholder = "Search...";
        searchInput.addEventListener("input", () => {
            setItems(
                qamFeatures.filter((i) => isFeatureEnabled(i.id) && i.subscreen.name.toLowerCase().includes(searchInput.value.toLowerCase()))
            );
        });

        const sidebarButtons = document.createElement("div");
        sidebarButtons.style.cssText = "overflow-y: auto; scrollbar-width: none;";

        let sidebarActiveButton: HTMLButtonElement;

        const setItems = (items: QAMFeature[]) => {
            sidebarButtons.innerHTML = "";
            items.forEach((b) => {
                const btn = document.createElement("button");
                addDynamicClass(btn, {
                    base: {
                        display: "flex",
                        alignItems: "center",
                        columnGap: "0.45em",
                        cursor: "pointer",
                        fontSize: "clamp(10px, 10vw, 30px)",
                        background: "none",
                        border: "none",
                        padding: "0.25em",
                        borderTop: "1px solid #5e0b14",
                        color: "#e7d2c6",
                        width: "100%"
                    },
                    hover: {
                        background: "#2a0a0e"
                    }
                });

                const detailsContainer = document.createElement("div");
                detailsContainer.style.cssText = "display: flex; flex-direction: column; align-items: flex-start; row-gap: 4px;";

                const name = document.createElement("span");
                name.style.fontSize = "clamp(10px, 5vw, 22px)";
                if (b.isBeta) {
                    name.innerHTML = b.subscreen.name + "<span style='position: relative; bottom: 0.75em; margin-left: 0.45em; padding: 0 0.35em; border-radius: 6px; background: #d4af37; font-size: 0.5em; color: #160a0c; border: 1px solid #7a5a1e;'>Beta</span>";
                } else {
                    name.textContent = b.subscreen.name;
                }

                const description = document.createElement("span");
                description.style.fontSize = "clamp(8px, 1vw, 16px)";
                description.style.color = "#a98a78";
                description.style.maxWidth = "calc(340px - clamp(10px, 8vw, 35px) - 0.45em)";
                description.style.whiteSpace = "nowrap";
                description.style.overflow = "clip";
                description.style.textOverflow = "ellipsis";
                description.style.padding = "2px";
                description.textContent = b.subscreen.description;

                const icon = createElement(b.icon);
                icon.style.cssText = "background: rgba(94, 11, 20, 0.55); flex-shrink: 0; width: clamp(10px, 8vw, 35px); height: clamp(10px, 8vw, 35px); padding: 4px; stroke: #d4af37; border-radius: 4px;";
                btn.addEventListener("click", () => {
                    featureContent.innerHTML = "";
                    b.subscreen.load(featureContent);
                    if (sidebarActiveButton) {
                        sidebarActiveButton.style.borderLeft = "";
                        sidebarActiveButton.style.background = "";
                    }
                    sidebarActiveButton = btn;
                    sidebarActiveButton.style.borderLeft = "3px solid #d4af37";
                    sidebarActiveButton.style.background = "linear-gradient(90deg, rgba(212, 175, 55, 0.14), rgba(94, 11, 20, 0.30))";
                    contentAreaHeaderTitle.textContent = b.subscreen.name;
                    contentAreaHeaderDescription.textContent = b.subscreen.description;
                });
                detailsContainer.append(name, description);
                btn.append(icon, detailsContainer);
                sidebarButtons.append(btn);
            });
        }

        const items = qamFeatures.filter((i) => isFeatureEnabled(i.id))
        if (items.length === 0) {
            const p = document.createElement("p");
            p.innerHTML = "You don't have any features enabled.<br>Configure it in QAM settings.";
            p.style.margin = "1.5em auto";
            p.style.background = "#1a0a0c";
            p.style.padding = "0.65em";
            p.style.border = "2px solid #5e0b14";
            p.style.borderRadius = "4px";
            p.style.color = "#e7d2c6";
            container.append(p);
        } else setItems(items);

        const footer = document.createElement("div");
        footer.style.cssText = "position: absolute; left: 0; bottom: 0; width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0.65em; background: rgba(20, 6, 8, 0.92); border-top: 2px solid #7a1f14;";

        const server = document.createElement("div");
        server.style.cssText = "display: flex; align-items: center; column-gap: 0.5em; background: #5e0b14; border-radius: 0.65em; padding: 0.65em; font-weight: bold; color: #e8c46a;";

        const ping = document.createElement("div");
        ping.style.cssText = "padding: 4px; background: #2a0a0e; border-radius: 6px; font-size: 0.8em; color: #e7d2c6;";
        ping.textContent = serverPing + "ms";

        const settingsBtn = createElement(Settings, { stroke: "#d4af37", height: "2em", width: "2em" });
        addDynamicClass(settingsBtn, {
            base: {
                cursor: "pointer",
                background: "#5e0b14",
                padding: "0.25em",
                borderRadius: "4px"
            },
            hover: {
                background: "#7a1f14"
            }
        });
        settingsBtn.addEventListener("click", async () => {
            await PreferenceOpenSubscreen("Extensions");
            await PreferenceSubscreenExtensionsOpen(MOD_DATA.key, ["Online", "ChatRoom"]);
            setSubscreen(new MainSubscreen(true));
            const qam: HTMLDivElement = document.querySelector(".bccQAM");
            qam.style.display = "none";
        });

        header.append(headerLeftButtonsContainer, title, headerRightButtonsContainer);
        sidebar.append(searchInput, sidebarButtons);
        server.append(getServer(), ping);
        footer.append(server, settingsBtn);
        contentAreaHeader.append(contentAreaHeaderTitle, contentAreaHeaderDescription);
        contentArea.append(contentAreaHeader, featureContent);
        const flexContainer = document.createElement("div");
        flexContainer.style.cssText = "display: flex; width: 100%; height: calc(100% - 6.6em);";
        flexContainer.append(sidebar, contentArea);
        container.append(header, flexContainer, footer);
        new QAMWindow(container, header);
        new WelcomeQAMSubscreen().load(featureContent);
        contentAreaHeaderTitle.textContent = "Welcome to QAM";
        container.style.left = ((window.innerWidth - container.offsetWidth) / 2) + "px";
        container.style.top = ((window.innerHeight - container.offsetHeight) / 2) + "px";
    }
}