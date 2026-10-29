import { games } from "./games.js";

export const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

export function summarizeCatalog(catalog = games) {
  const categories = [...new Set(catalog.map((game) => game.category))];
  return {
    total: catalog.length,
    categories,
    counts: Object.fromEntries(categories.map((category) => [category, catalog.filter((game) => game.category === category).length])),
    nextSector: catalog.length + 1,
  };
}

// The last entry is the latest release. Choose one game from each other genre
// before filling any remaining artwork slots; no array positions to maintain.
export function selectHeroGames(catalog = games) {
  const newestFirst = [...catalog].reverse().filter((game) => !game.artworkPending);
  const picks = [];
  const categories = new Set();
  for (const game of newestFirst) {
    if (!categories.has(game.category)) {
      picks.push(game);
      categories.add(game.category);
    }
  }
  for (const game of newestFirst) {
    if (!picks.includes(game)) picks.push(game);
  }
  return picks.slice(0, 5);
}

const twoDigits = (number) => String(number).padStart(2, "0");
const externalLink = (url, label, className = "") =>
  `<a class="${className}" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(label)} (opens in a new tab)">`;

export function renderGameCards(catalog = games, filter = "All") {
  return catalog.filter((game) => filter === "All" || game.category === filter).map((game) => `
    <article class="game-card reveal" style="--card-accent:${escapeHTML(game.accent)}" data-category="${escapeHTML(game.category)}" data-game-id="${escapeHTML(game.id)}">
      ${externalLink(game.url, `Play ${game.title}`, "game-media")}
        <img src="${escapeHTML(game.image)}" alt="${escapeHTML(game.title)} Roblox thumbnail" width="${game.imageWidth || 500}" height="${game.imageHeight || 280}" loading="lazy" decoding="async" />
        ${game.artworkPending ? '<span class="game-artwork-note">Official artwork coming soon</span>' : ''}
        <span class="image-shade"></span>
        <span class="game-status"><i></i>${escapeHTML(game.status)}</span>
        <span class="play-disc" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 7.25v9.5L17 12 9 7.25Z"/></svg></span>
      </a>
      <div class="game-card-body">
        <div class="game-card-meta"><span>Sector ${twoDigits(catalog.indexOf(game) + 1)}</span><span>${escapeHTML(game.category)}</span></div>
        <h3>${escapeHTML(game.title)}</h3>
        <p>${escapeHTML(game.description)}</p>
        ${externalLink(game.url, `Play ${game.title}`, "game-link")}Play on Roblox <span aria-hidden="true">↗</span></a>
      </div>
    </article>`).join("\n");
}

export function renderFilters(catalog = games) {
  const summary = summarizeCatalog(catalog);
  return ["All", ...summary.categories].map((category) => `
    <button type="button" class="${category === "All" ? "is-active" : ""}" data-filter="${escapeHTML(category)}" aria-pressed="${category === "All"}" aria-controls="games-grid">
      ${escapeHTML(category)} <span class="filter-count">${category === "All" ? summary.total : summary.counts[category]}</span>
    </button>`).join("\n");
}

export function renderHeroCards(catalog = games) {
  return selectHeroGames(catalog).map((game, index) => `
    <figure class="hero-game-card hero-game-${index + 1}">
      ${externalLink(game.url, `Play ${game.title}`, "hero-game-link")}
        <img src="${escapeHTML(game.image)}" alt="${escapeHTML(game.title)} Roblox thumbnail" width="${game.imageWidth || 500}" height="${game.imageHeight || 280}" ${index === 0 ? 'fetchpriority="high"' : 'loading="eager"'} decoding="async" />
      </a>
      <figcaption>${twoDigits(catalog.indexOf(game) + 1)} / ${escapeHTML(game.title)}</figcaption>
    </figure>`).join("\n");
}
