# <b>Hell Magic</b>

A hell- and foxfire-themed cheat / magic addon for Bondage Club, built around a
kitsune that is the embodiment of Hell itself.

> ⚠️ This mod is OP in many aspects. If that's not for you, please move on.

## Credit / base

**This addon was created using Bondage Club Chaos (BCC) by Zoi as its base:**
**https://github.com/FurryZoi/Bondage-Club-Chaos**

Hell Magic is a re-themed and extended fork of that project. All original
mechanics, architecture and code are the work of Zoi and contributors; this
fork re-skins the "Dark Magic" / "Aura of Chaos" theme into a hellfire/foxfire
(kitsunebi) identity and adds aura interaction features (see Changes). The
original project is MIT-licensed; the original copyright and license are kept
in `LICENCE`.

## Changes from the base

- Re-themed identity: **Foxfire Magic** page, **Foxfire Aura**, hellfire/foxfire
  flavor text, ember palette and flame icons.
- **Unbreakable** aura mode — always on, all triggers, cannot be switched off
  externally.
- **Anti-retribution** — hardcoded always-on. When you act on someone whose aura
  is up, retaliation aimed back at you is undone: returned restraints are
  stripped, and a spell of yours that would bounce off their aura is dropped
  instead of landing on you. Covers both Dark Magic and LSCG spells. People on
  your own aura whitelist are exempt, so they can still act on you normally.
  There is no setting for this any more — see `src/modules/auraBreaker.ts`.
- **Foxfire Recognition** — an opt-in exemption, off by default. On first load
  this build asks the player once whether their Foxfire Aura should recognize its
  creator; accepting means the aura won't trigger against her — items, clothes,
  pose and spells all pass — and declining is remembered and never asked again.
  It lives in its own setting (`foxfireRecognition.enabled`) and its own QAM
  screen (**Recognition**, feature id 1021), so it never touches the player's own
  aura whitelist and can be switched off at any time, taking effect immediately.
  Everyone other than the creator is unaffected.
- **Foxfire Ward** — Hell Magic will not carry an action against the kitsune the
  addon is themed on (member `171475`). Restraint changes, appearance pushes and
  spells aimed at her are dropped client-side with an in-theme notice instead of
  being sent. It is disabled on her own client. See `src/modules/foxfireWard.ts`;
  set `ANNOUNCE_WARD = false` there for a silent drop, or change
  `WARDED_MEMBER_NUMBER` if you are running your own build.

  Two honest limits: it binds **only** clients running Hell Magic — vanilla
  players, plain BCC and LSCG users are unaffected, since their client never runs
  this code. And it is client-side, so anyone who forks this repo and deletes the
  module is out from under it. Treat it as flavour. Real protection is Bondage
  Club's own item permissions, whitelist and blacklist.

### Not implemented

**Shatter enemy aura** was listed here in earlier revisions. There is no
implementation of it anywhere in `src/` — the only thing resembling it is gated
behind a race check that almost never passes. Removed from the feature list until
it does something.

The internal mod id and storage key remain `BCC` on purpose, so this build can
still read other players' synced state and interact with current-version
Bondage Club Chaos shields.

## Installation

### Tampermonkey
Create a new script in Tampermonkey and paste in the contents of
[`bcc.user.js`](bcc.user.js) (also shown below), then save.

### Bookmark
Use [`bcc.bookmark.js`](bcc.bookmark.js) as a bookmarklet.

Both load `bundle.js` from this repo's GitHub Pages site
(`https://nicole-bc.github.io/Hell-Magic/bundle.js`).

## Hosting your build
This repo deploys automatically. On every push to `main`, the GitHub
Actions workflow (`.github/workflows/deploy.yml`) runs `pnpm build` and
publishes the `dist` folder to the `gh-pages` branch.

One-time setup: repo **Settings → Pages → Source → Deploy from a branch →
`gh-pages` / root**. After that just push source changes; do **not** commit
`bundle.js` yourself (`dist` is git-ignored and built by CI).
The userscript loads `https://nicole-bc.github.io/Hell-Magic/bundle.js`,
which Pages serves from the deployed `gh-pages` branch.

## Tampermonkey script

```javascript
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
```

## Credits

- **Base addon — Bondage Club Chaos** by Zoi — https://github.com/FurryZoi/Bondage-Club-Chaos
- **Kitnyx2 font** — KitTheCat
- **Game-Icons** — game-icons.net
- **Lucide Icons** — lucide.dev
