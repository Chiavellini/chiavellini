const body = document.body;
const themeToggle = document.getElementById("themeToggle");
const yearEl = document.getElementById("year");

const storedTheme = localStorage.getItem("chiavellini-theme");
const prefersDark =
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

function setTheme(mode) {
  const resolved = mode || (prefersDark ? "dark" : "light");
  body.dataset.theme = resolved;
  localStorage.setItem("chiavellini-theme", resolved);
}

function toggleTheme() {
  const nextMode = body.dataset.theme === "light" ? "dark" : "light";
  setTheme(nextMode);
}

if (storedTheme) {
  setTheme(storedTheme);
} else {
  setTheme();
}

if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

