/* ─────────────────────────────────────────────────────────
   Paperazzi — Frontend Logic
   ───────────────────────────────────────────────────────── */

const API_BASE = window.location.origin;

// ── DOM refs ─────────────────────────────────────────────
const searchForm   = document.getElementById("searchForm");
const queryInput   = document.getElementById("queryInput");
const searchBtn    = document.getElementById("searchBtn");
const btnText      = document.getElementById("btnText");
const decBtn       = document.getElementById("decBtn");
const incBtn       = document.getElementById("incBtn");
const countDisplay = document.getElementById("countDisplay");
const resultsArea  = document.getElementById("results");
const resultsMeta  = document.getElementById("resultsMeta");
const cardsGrid    = document.getElementById("cardsGrid");
const emptyState   = document.getElementById("emptyState");
const errorState   = document.getElementById("errorState");
const errorMsg     = document.getElementById("errorMsg");

// ── State ────────────────────────────────────────────────
let count = 5;
const MIN_COUNT = 1;
const MAX_COUNT = 25;

// ── Count controls ───────────────────────────────────────
function updateCount(delta) {
  count = Math.min(MAX_COUNT, Math.max(MIN_COUNT, count + delta));
  countDisplay.textContent = count;
}

decBtn.addEventListener("click", () => updateCount(-1));
incBtn.addEventListener("click", () => updateCount(+1));

// ── Helpers ──────────────────────────────────────────────
function showOnly(...visibleEls) {
  [resultsArea, emptyState, errorState].forEach(el => el.classList.add("hidden"));
  visibleEls.forEach(el => el.classList.remove("hidden"));
}

function setLoading(on) {
  searchBtn.disabled = on;
  if (on) {
    searchBtn.classList.add("loading");
    btnText.textContent = "Searching";
  } else {
    searchBtn.classList.remove("loading");
    btnText.textContent = "Search";
  }
}

// ── Truncate authors list ─────────────────────────────────
function formatAuthors(authors) {
  if (authors.length <= 4) return authors.join(", ");
  return authors.slice(0, 3).join(", ") + ` +${authors.length - 3} more`;
}

// ── Build paper card HTML ─────────────────────────────────
function buildCard(paper, index) {
  const card = document.createElement("article");
  card.className = "paper-card";
  card.style.animationDelay = `${index * 60}ms`;

  card.innerHTML = `
    <p class="card-number">PAPER ${String(index + 1).padStart(2, "0")}</p>
    <h3 class="card-title">${escapeHtml(paper.title)}</h3>
    <p class="card-category">${paper.category}</p>
    <p class="card-authors">${escapeHtml(formatAuthors(paper.authors))}</p>
    <hr class="card-divider" />
    <p class="card-summary">${escapeHtml(paper.summary)}</p>
    <div class="card-footer">
      <span class="card-date">Published ${escapeHtml(paper.published)}</span>
      <div class="card-links">
        <a class="card-link" href="${paper.arxiv_url}" target="_blank" rel="noopener">ArXiv ↗</a>
        <a class="card-link" href="${paper.pdf_url}" target="_blank" rel="noopener">PDF ↗</a>
      </div>
    </div>
  `;

  return card;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Main search ──────────────────────────────────────────
async function doSearch(query) {
  setLoading(true);

  try {
    const url = new URL(`${API_BASE}/search`);
    url.searchParams.set("query", query);
    url.searchParams.set("max_results", count);

    const res  = await fetch(url.toString());

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Server error");
    }

    const data = await res.json();

    if (!data.papers || data.papers.length === 0) {
      showOnly(emptyState);
      return;
    }

    // Render
    cardsGrid.innerHTML = "";
    data.papers.forEach((paper, i) => {
      cardsGrid.appendChild(buildCard(paper, i));
    });

    resultsMeta.innerHTML =
      `Showing <span>${data.total_found}</span> result${data.total_found !== 1 ? "s" : ""} for <span>"${escapeHtml(data.query)}"</span>`;

    showOnly(resultsArea);

    // Scroll to results
    resultsArea.scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (err) {
    errorMsg.textContent = err.message || "Connection failed. Is the server running?";
    showOnly(errorState);
  } finally {
    setLoading(false);
  }
}

// ── Form submit ───────────────────────────────────────────
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = queryInput.value.trim();
  if (query) doSearch(query);
});

// ── Enter key on input ────────────────────────────────────
queryInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchForm.dispatchEvent(new Event("submit"));
  }
});
