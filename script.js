(() => {
  "use strict";

  const games = Array.isArray(window.FRONT_LINE_GAMES)
    ? window.FRONT_LINE_GAMES
    : [];
  const grid = document.querySelector("[data-games-grid]");
  const filters = document.querySelector("[data-filters]");
  const count = document.querySelector("[data-game-count]");
  const totalGames = document.querySelector("[data-total-games]");
  const heroCards = document.querySelector("[data-hero-cards]");
  const menuButton = document.querySelector("[data-menu-button]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");
  const header = document.querySelector("[data-header]");
  let activeFilter = "All";

  const twoDigits = (value) => String(value).padStart(2, "0");

  const externalLink = (url, label, className = "") =>
    `<a class="${className}" href="${url}" target="_blank" rel="noreferrer" aria-label="${label} (opens in a new tab)">`;

  function renderHero() {
    if (!heroCards) return;
    const picks = [games[6], games[2], games[8], games[1], games[7]].filter(Boolean);
    heroCards.innerHTML = picks
      .map(
        (game, index) => `
          <figure class="hero-game-card hero-game-${index + 1}">
            <img
              src="${game.image}"
              alt="${game.title} Roblox thumbnail"
              ${index === 0 ? 'fetchpriority="high"' : 'loading="eager"'}
              decoding="async"
            />
            <figcaption>${twoDigits(games.indexOf(game) + 1)} / ${game.title}</figcaption>
          </figure>
        `,
      )
      .join("");
  }

  function createGameCard(game, index) {
    const sector = games.indexOf(game) + 1;
    return `
      <article class="game-card reveal" style="--card-accent:${game.accent}" data-category="${game.category}">
        ${externalLink(game.url, `Play ${game.title}`, "game-media")}
          <img
            src="${game.image}"
            alt="${game.title} Roblox thumbnail"
            loading="${index < 2 ? "eager" : "lazy"}"
            decoding="async"
          />
          <span class="image-shade"></span>
          <span class="game-status"><i></i>${game.status}</span>
          <span class="play-disc" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M9 7.25v9.5L17 12 9 7.25Z"/></svg>
          </span>
        </a>
        <div class="game-card-body">
          <div class="game-card-meta">
            <span>Sector ${twoDigits(sector)}</span>
            <span>${game.category}</span>
          </div>
          <h3>${game.title}</h3>
          <p>${game.description}</p>
          ${externalLink(game.url, `Deploy to ${game.title}`, "game-link")}
            Deploy on Roblox
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </article>
    `;
  }

  function observeReveals() {
    const revealItems = document.querySelectorAll(".reveal:not(.is-visible)");
    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -4% 0px" },
    );
    revealItems.forEach((item) => observer.observe(item));
  }

  function renderGames() {
    if (!grid) return;
    const visible =
      activeFilter === "All"
        ? games
        : games.filter((game) => game.category === activeFilter);
    grid.innerHTML = visible.map(createGameCard).join("");
    if (count) count.textContent = twoDigits(visible.length);
    observeReveals();
  }

  function renderFilters() {
    if (!filters) return;
    const categories = ["All", ...new Set(games.map((game) => game.category))];
    filters.innerHTML = categories
      .map(
        (category) => `
          <button
            type="button"
            class="${category === activeFilter ? "is-active" : ""}"
            data-filter="${category}"
            aria-pressed="${category === activeFilter}"
          >
            ${category}
          </button>
        `,
      )
      .join("");

    filters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button || button.dataset.filter === activeFilter) return;
      activeFilter = button.dataset.filter;
      filters.querySelectorAll("[data-filter]").forEach((item) => {
        const selected = item.dataset.filter === activeFilter;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      renderGames();
    });
  }

  function updateClock() {
    const clock = document.querySelector("[data-local-time]");
    if (!clock) return;
    const now = new Date();
    clock.textContent = `${twoDigits(now.getUTCHours())}:${twoDigits(
      now.getUTCMinutes(),
    )}:${twoDigits(now.getUTCSeconds())} UTC`;
  }

  function setupMenu() {
    if (!menuButton || !mobileMenu) return;
    const closeMenu = () => {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
      mobileMenu.classList.remove("is-open");
      document.body.classList.remove("menu-open");
    };
    menuButton.addEventListener("click", () => {
      const opening = menuButton.getAttribute("aria-expanded") !== "true";
      menuButton.setAttribute("aria-expanded", String(opening));
      menuButton.setAttribute("aria-label", opening ? "Close navigation" : "Open navigation");
      mobileMenu.classList.toggle("is-open", opening);
      document.body.classList.toggle("menu-open", opening);
    });
    mobileMenu.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  function setupScrollState() {
    let previousY = window.scrollY;
    const update = () => {
      const currentY = window.scrollY;
      header?.classList.toggle("is-scrolled", currentY > 24);
      header?.classList.toggle(
        "is-hidden",
        currentY > previousY && currentY > 320 && !document.body.classList.contains("menu-open"),
      );
      previousY = currentY;
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function setupPointerScan() {
    if (!window.matchMedia("(pointer:fine)").matches) return;
    window.addEventListener(
      "pointermove",
      (event) => {
        document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
        document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
      },
      { passive: true },
    );
  }

  renderHero();
  renderFilters();
  renderGames();
  setupMenu();
  setupScrollState();
  setupPointerScan();
  observeReveals();
  updateClock();
  window.setInterval(updateClock, 1000);

  document.querySelectorAll("[data-total-games]").forEach((item) => {
    item.textContent = twoDigits(games.length);
  });
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
