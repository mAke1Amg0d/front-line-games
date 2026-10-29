# Front Line Games

Official website for **Front Line Games**, an independent Roblox studio.

[Live website](https://make1amg0d.github.io/front-line-games/) · [Discord](https://discord.gg/gZH5ahvqGe) · [Roblox community](https://www.roblox.com/communities/246804689)

## Local development

Use Node.js 22.12 or later:

```sh
npm ci
npm run build
npm run dev
```

Open the loopback URL printed in the terminal. Set `PORT` if 4173 is occupied.
The preview also supports `/front-line-games/` to test the GitHub Pages project path.
It only serves public site assets; repository configuration and dependency files are excluded.

## Add a release

1. Append a unique entry to `games.js`, keeping releases ordered oldest to newest.
2. Include the title, category, status, summary, direct Roblox place URL, and accent.
3. Run `npm run refresh:artwork`. It verifies studio ownership against public Roblox APIs and downloads official WebP thumbnails. No key or browser cookie is needed. Review `assets/games/manifest.json` for provenance.
4. Run `npm test`. Review desktop, tablet, and mobile layouts. Update the catalog fixture when intentionally adding a new game.
5. Commit the catalog, generated `index.html`, thumbnail files, and manifest together.

The build generates the game cards, filter counts, category totals, next sector,
hero selection, and sharing descriptions from one catalog. The newest release
leads the hero. The generated HTML includes every game for search engines and
players without JavaScript; JavaScript enhances filtering and navigation.

## Publish

GitHub Pages serves the repository root on `main`. Push the reviewed changes,
wait for Pages and Website checks to pass, then verify the live site. Do not
change the hosting provider or add a backend. `.openai/hosting.json` and the
optional generated worker are retained for compatibility with the original project.

The Website checks workflow runs the full suite and rejects an out-of-date
generated catalog. `npm test` does not call external services.

## Release checks

- Verify all game links, local artwork, counts, metadata, and status labels.
- Check keyboard navigation, mobile menu, all filters, and Pause animations.
- Check reduced motion and loading with JavaScript disabled.
- Keep founder accounts in the Founder section and studio accounts in Studio links.
- In Discord, update the existing release post or add one if missing. Add the game to all three forums, its opt-in role, and the onboarding question.
- Preserve private staff channels and staff-controlled announcements. Never use mass mentions without explicit approval.
- On Roblox, verify public access, audience reach, content maturity, supported devices, and the studio Discord link.

## Project

Static HTML, CSS, and browser modules; no paid service or runtime backend.
Development dependency: linkedom for isolated DOM behavior tests. The test suite
covers catalog integrity, future releases, filters, static rendering, menus,
asset fallback, motion controls, social metadata, and public asset serving.
