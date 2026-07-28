# Front Line Games

Official website for Front Line Games, an independent Roblox studio.

## Local preview

```bash
npm run dev
```

Open `http://localhost:4173`.

## Production build

```bash
npm run build
```

The deployable output is written to `dist/`. The root static files are also
compatible with GitHub Pages.

## Add another game

Open `games.js`, copy one existing object inside `window.FRONT_LINE_GAMES`, and
change its fields. The game grid, filters, total count, and hero artwork update
automatically.
