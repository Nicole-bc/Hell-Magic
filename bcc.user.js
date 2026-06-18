// ==UserScript==
// @name         Hell Magic
// @namespace    https://www.bondageprojects.com/
// @version      2.1.0
// @description  Hell/foxfire-themed cheat & magic addon for Bondage Club. Based on Bondage Club Chaos by Zoi (https://github.com/FurryZoi/Bondage-Club-Chaos).
// @author       Nicole-bc
// @match        https://bondageprojects.elementfx.com/*
// @match        https://www.bondageprojects.elementfx.com/*
// @match        https://bondage-europe.com/*
// @match        https://www.bondage-europe.com/*
// @match        https://www.bondageprojects.com/*
// @match        https://bondageprojects.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

setTimeout(function () {
    let n = document.createElement("script");
    n.setAttribute("language", "JavaScript");
    n.setAttribute("crossorigin", "anonymous");
    n.setAttribute("src", "https://nicole-bc.github.io/Hell-Magic/bundle.js");
    n.onload = () => n.remove();
    document.head.appendChild(n);
}, 1000);
