import { games } from "./games.js";
import { renderGameCards, summarizeCatalog } from "./catalog.mjs";

const grid = document.querySelector("[data-games-grid]");
const filters = document.querySelector("[data-filters]");
const count = document.querySelector("[data-game-count]");
const menuButton = document.querySelector("[data-menu-button]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const header = document.querySelector("[data-header]");
const motionButton = document.querySelector("[data-motion-button]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const summary = summarizeCatalog(games);
const twoDigits = (value) => String(value).padStart(2, "0");
let activeFilter = "All";

const revealObserver = "IntersectionObserver" in window && !reducedMotion.matches
  ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }, { threshold: 0.05 })
  : null;

function observeReveals() {
  document.querySelectorAll(".reveal:not(.is-visible)").forEach((item) => {
    if (revealObserver) revealObserver.observe(item);
    else item.classList.add("is-visible");
  });
}

// Capture load failures, including for cards added when a filter changes.
// The catalog remains playable even if an artwork file cannot be loaded.
document.addEventListener("error", (event) => {
  const image = event.target;
  if (image.tagName !== "IMG" || !image.closest(".game-media, .hero-game-card") || image.dataset.fallback) return;
  image.dataset.fallback = "true";
  image.alt = `${image.alt.replace(" Roblox thumbnail", "")} — artwork unavailable`;
  image.src = "brand-icon.png";
}, true);

function renderGames() {
  revealObserver?.disconnect();
  if (grid) grid.innerHTML = renderGameCards(games, activeFilter);
  if (count) count.textContent = twoDigits(activeFilter === "All" ? summary.total : summary.counts[activeFilter]);
  observeReveals();
}

filters?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button || !filters.contains(button) || button.dataset.filter === activeFilter) return;
  activeFilter = button.dataset.filter;
  filters.querySelectorAll("[data-filter]").forEach((item) => {
    const selected = item.dataset.filter === activeFilter;
    item.classList.toggle("is-active", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  renderGames();
});

function closeMenu(restoreFocus = false) {
  if (!menuButton || !mobileMenu) return;
  const wasOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
  mobileMenu.classList.remove("is-open");
  mobileMenu.inert = true;
  document.body.classList.remove("menu-open");
  document.querySelector("main").inert = false;
  document.querySelector("footer").inert = false;
  if (restoreFocus && wasOpen) menuButton.focus();
}

if (menuButton && mobileMenu) {
  mobileMenu.inert = true;
  menuButton.addEventListener("click", () => {
    if (menuButton.getAttribute("aria-expanded") === "true") return closeMenu(true);
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.setAttribute("aria-label", "Close navigation");
    mobileMenu.inert = false;
    mobileMenu.classList.add("is-open");
    document.body.classList.add("menu-open");
    document.querySelector("main").inert = true;
    document.querySelector("footer").inert = true;
    window.requestAnimationFrame(() => mobileMenu.querySelector("a")?.focus());
  });
  mobileMenu.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    closeMenu();
    if (link.hash && link.origin === window.location.origin) {
      document.querySelector(link.hash)?.focus({ preventScroll: true });
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu(true);
    if (event.key !== "Tab" || menuButton.getAttribute("aria-expanded") !== "true") return;
    const links = [...mobileMenu.querySelectorAll("a")];
    if (event.shiftKey && document.activeElement === menuButton) {
      event.preventDefault();
      links.at(-1)?.focus();
    } else if (event.shiftKey && document.activeElement === links[0]) {
      event.preventDefault();
      menuButton.focus();
    } else if (!event.shiftKey && document.activeElement === links.at(-1)) {
      event.preventDefault();
      menuButton.focus();
    } else if (!event.shiftKey && document.activeElement === menuButton) {
      event.preventDefault();
      links[0]?.focus();
    }
  });
  window.matchMedia("(min-width: 821px)").addEventListener("change", (event) => {
    if (event.matches) closeMenu(true);
  });
}

motionButton?.addEventListener("click", () => {
  const paused = document.body.classList.toggle("motion-paused");
  motionButton.setAttribute("aria-pressed", String(paused));
  motionButton.textContent = paused ? "Resume animations" : "Pause animations";
});

let scrollScheduled = false;
function updateScrollState() {
  const currentY = window.scrollY;
  header?.classList.toggle("is-scrolled", currentY > 24);
  scrollScheduled = false;
}
window.addEventListener("scroll", () => {
  if (!scrollScheduled) {
    scrollScheduled = true;
    window.requestAnimationFrame(updateScrollState);
  }
}, { passive: true });

const clock = document.querySelector("[data-local-time]");
function updateClock() {
  if (!clock || document.hidden) return;
  const now = new Date();
  clock.textContent = `${twoDigits(now.getUTCHours())}:${twoDigits(now.getUTCMinutes())} UTC`;
}
updateClock();
window.setInterval(updateClock, 60000);
document.addEventListener("visibilitychange", updateClock);
const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());
observeReveals();
updateScrollState();
