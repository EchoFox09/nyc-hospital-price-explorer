/**
 * NYC Hospital Price Explorer
 * Common app code shared by all 4 pages.
 */

// ============================================================
// CONSTANTS
// ============================================================

const HOSPITAL_TYPE_ID    = '345d2569d06046958f2d8bc34d4d96f9';
const PROCEDURE_TYPE_ID   = '9738d38f22fc5321ace5f89b454f7e28';
const PRICE_ENTRY_TYPE_ID = 'f592487c55594fffa8bfb954e794c877';
const HEALTH_SPACE_ID     = '52c7ae149838b6d47ce0f3b2a5974546';
const PRICE_SUBSPACE_ID   = '44eb138f564fbed6ed9ce543de1b849c';

const GRAPHQL_ENDPOINT = 'https://testnet-api.geobrowser.io/graphql';

const PRICE_PROPS = {
  gross:        '967ce8a03073462f850b47e3743b1835',
  cash:         'd68d805b2ecc46a98d452bc846d36c53',
  min_neg:      'd490631b5e874303ba174e4318d5d4a2',
  max_neg:      '2a3ad4efbd73487392d58e87c293712f',
  rel_hospital: 'ff02e33d8e4044bf90a2a3607a182df4',
  rel_procedure:'99443238a9d841a6a7fe4a55aafa5959',
};

const HOSPITAL_ORDER = [
  { slug: 'bronxcare-health-system',           short: 'BronxCare',       full: 'BronxCare Health System' },
  { slug: 'brookdale-hospital-medical-center', short: 'Brookdale',       full: 'Brookdale Hospital Medical Center' },
  { slug: 'kingsbrook-jewish-medical-center',  short: 'Kingsbrook',      full: 'Kingsbrook Jewish Medical Center' },
  { slug: 'st-barnabas-hospital',              short: 'St. Barnabas',    full: 'St. Barnabas Hospital' },
  { slug: 'bellevue-hospital-center',          short: 'Bellevue',        full: 'Bellevue Hospital Center' },
  { slug: 'montefiore-medical-center',         short: 'Montefiore',      full: 'Montefiore Medical Center' },
  { slug: 'englewood-health',                  short: 'Englewood',       full: 'Englewood Health' },
  { slug: 'nyu-langone-brooklyn',              short: 'NYU Brooklyn',    full: 'NYU Langone Brooklyn' },
  { slug: 'nyu-langone-tisch-hospital',        short: 'NYU Tisch',       full: 'NYU Langone Tisch Hospital' },
  { slug: 'nyu-langone-long-island',           short: 'NYU Long Island', full: 'NYU Langone Long Island' },
];

const CATEGORY_MAPPING = {
  'Radiology':     ['Imaging'],
  'Lab tests':     ['Laboratory'],
  'Surgery':       ['Surgery/Procedures', 'Surgical'],
  'Cardiology':    ['Cardiac/Vascular'],
  'Therapy':       ['Therapeutic', 'Therapy/Diagnostic'],
  'Office visits': ['Visits'],
};

const UI_CATEGORIES = Object.keys(CATEGORY_MAPPING);
const MIN_DOMINANCE_RATIO = 0.5;

const SOURCES = {
  hospitals:  'json',
  procedures: 'json',
  prices:     'json',
};

// ============================================================
// STATE
// ============================================================

const STATE = {
  hospitals:  null,
  procedures: null,
  prices:     null,
  loaded:     false,
};

// ============================================================
// DATA LOADING
// ============================================================

async function loadData() {
  if (STATE.loaded) return STATE;
  const res = await fetch('data.json');
  if (!res.ok) throw new Error(`Failed to load data.json: ${res.status}`);
  const data = await res.json();
  STATE.hospitals  = data.hospitals;
  STATE.procedures = data.procedures;
  STATE.prices     = data.prices;
  STATE.loaded     = true;
  console.log('[app] Data loaded:',
    STATE.hospitals.length, 'hospitals,',
    STATE.procedures.length, 'procedures,',
    STATE.prices.length, 'prices');
  return STATE;
}

// ============================================================
// HELPERS
// ============================================================

function getPrice(hospitalSlug, procedureSlug) {
  return STATE.prices.find(p =>
    p.hospital_slug === hospitalSlug && p.procedure_slug === procedureSlug
  ) || null;
}

function filterProceduresByCategory(uiCategory) {
  const dataCats = CATEGORY_MAPPING[uiCategory];
  if (!dataCats) return [];
  return STATE.procedures.filter(p =>
    p.categories && p.categories.some(c => dataCats.includes(c))
  );
}

function rankPricesInRow(procedureSlug, priceField) {
  priceField = priceField || 'gross';
  const items = HOSPITAL_ORDER.map(h => {
    const pr = getPrice(h.slug, procedureSlug);
    return {
      hospital_slug: h.slug,
      price: (pr && pr[priceField] != null) ? pr[priceField] : null,
    };
  });
  const withPrice = items
    .filter(i => i.price != null)
    .sort((a, b) => a.price - b.price);
  const rankMap = new Map();
  withPrice.forEach((item, idx) => {
    let rank;
    if (idx < 3)      rank = 'lo';
    else if (idx < 7) rank = 'md';
    else              rank = 'hi';
    rankMap.set(item.hospital_slug, rank);
  });
  return items.map(i => ({
    hospital_slug: i.hospital_slug,
    price: i.price,
    rank: i.price != null ? rankMap.get(i.hospital_slug) : 'na',
  }));
}

function formatPrice(price) {
  if (price == null) return '—';
  return '$' + Math.round(price).toLocaleString('en-US');
}

function getHospital(slug) {
  return STATE.hospitals.find(h => h.slug === slug) || null;
}

function getProcedure(slug) {
  return STATE.procedures.find(p => p.slug === slug) || null;
}

function getProcedureByCpt(cpt) {
  return STATE.procedures.find(p => p.cpt === cpt) || null;
}

function findCategoryForProcedure(procSlug) {
  for (const uiCat of UI_CATEGORIES) {
    if (filterProceduresByCategory(uiCat).find(p => p.slug === procSlug)) {
      return uiCat;
    }
  }
  return UI_CATEGORIES[0];
}

function readQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    proc: params.get('proc'),
    hospital: params.get('hospital'),
  };
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function shortDomain(url) {
  if (!url) return '';
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

// ============================================================
// PAGE DETECTION
// ============================================================

function getCurrentPage() {
  const path = window.location.pathname;
  if (path.endsWith('/price-map.html'))     return 'price-map';
  if (path.endsWith('/insurer-rates.html')) return 'insurer-rates';
  if (path.endsWith('/about.html'))         return 'about';
  return 'compare';
}

// ============================================================
// BOOTSTRAP
// ============================================================


// ============================================================
// THEME (light/dark)
// ============================================================

(function applyThemeEarly() {
  // Read stored theme or fall back to OS preference. Apply BEFORE DOMContentLoaded
  // to avoid flash of incorrect theme.
  let theme;
  try { theme = localStorage.getItem('theme'); } catch (e) {}
  if (theme !== 'light' && theme !== 'dark') {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    theme = prefersLight ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();

function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const page = getCurrentPage();
  console.log('[app] Page:', page);
  initThemeToggle();
  try {
    await loadData();
  } catch (e) {
    console.error('[app] Data load failed:', e);
    return;
  }
  switch (page) {
    case 'compare':       initComparePage();      break;
    case 'price-map':     initPriceMapPage();     break;
    case 'insurer-rates': initInsurerRatesPage(); break;
    case 'about':         initAboutPage();        break;
  }
});

// ============================================================
// PAGE 1 — COMPARE
// ============================================================

function initComparePage() {
  const state = {
    category:      'Radiology',
    procedureSlug: null,
    hospitalSlug:  null,
    tab:           'gross',  // 'gross' | 'cash'
    sortMode:      'asc',    // 'asc' | 'desc' | 'name'
    search:        '',
  };

  // Read query params
  const qp = readQueryParams();
  if (qp.proc) {
    const proc = getProcedureByCpt(qp.proc);
    if (proc) {
      state.procedureSlug = proc.slug;
      state.category = findCategoryForProcedure(proc.slug);
    }
  }
  if (qp.hospital && HOSPITAL_ORDER.some(h => h.slug === qp.hospital)) {
    state.hospitalSlug = qp.hospital;
  }

  // Pick initial procedure/hospital if not set
  if (!state.procedureSlug) {
    const procs = filterProceduresByCategory(state.category);
    if (procs.length > 0) state.procedureSlug = procs[0].slug;
  }
  if (!state.hospitalSlug && state.procedureSlug) {
    const ranks = rankPricesInRow(state.procedureSlug, priceField());
    const first = ranks.find(r => r.price != null);
    if (first) state.hospitalSlug = first.hospital_slug;
    else state.hospitalSlug = HOSPITAL_ORDER[0].slug;
  }

  function priceField() {
    return state.tab === 'gross' ? 'gross' : 'cash';
  }

  // ===== RENDER =====

  function renderPicker() {
    const isSearching = state.search && state.search.trim().length > 0;

    // Procedure list — when searching, ignore category filter (search across ALL)
    let procs;
    if (isSearching) {
      procs = STATE.procedures.filter(p => matchSearch(p, state.search));
    } else {
      procs = filterProceduresByCategory(state.category);
    }

    // Set of categories that have matches (for chip highlight)
    const matchedCats = new Set();
    if (isSearching) {
      procs.forEach(p => {
        for (const uiCat of UI_CATEGORIES) {
          const dataCats = CATEGORY_MAPPING[uiCat];
          if (p.categories && p.categories.some(c => dataCats.includes(c))) {
            matchedCats.add(uiCat);
          }
        }
      });
    }

    // Category chips
    const chipsContainer = document.querySelector('.cat-chips');
    if (chipsContainer) {
      chipsContainer.innerHTML = UI_CATEGORIES.map(cat => {
        const classes = ['chip'];
        if (cat === state.category) classes.push('on');
        if (isSearching && matchedCats.has(cat)) classes.push('has-match');
        const dot = cat === state.category ? '<div class="chip-dot"></div>' : '';
        return `<div class="${classes.join(' ')}" data-cat="${escapeHtml(cat)}">${dot}${escapeHtml(cat)}</div>`;
      }).join('');
    }

    // Count label
    const countEl = document.querySelector('.cat-count');
    if (countEl) {
      if (isSearching) {
        countEl.textContent = `${procs.length} match${procs.length === 1 ? '' : 'es'} across all categories`;
      } else {
        countEl.textContent = `${procs.length} procedure${procs.length === 1 ? '' : 's'} in this category`;
      }
    }

    // Procedure list
    const listEl = document.querySelector('.proc-list');
    if (listEl) {
      listEl.innerHTML = procs.map(p => {
        const sel = p.slug === state.procedureSlug ? ' sel' : '';
        return `<div class="proc-item${sel}" data-slug="${escapeHtml(p.slug)}">
          <div class="proc-name">${escapeHtml(p.name)}</div>
          <div class="proc-cpt">CPT ${escapeHtml(p.cpt)}</div>
        </div>`;
      }).join('');
    }
  }

  function matchSearch(proc, q) {
    if (!q) return true;
    const lq = q.toLowerCase();
    return proc.name.toLowerCase().includes(lq) ||
           (proc.cpt && proc.cpt.includes(q));
  }

  function renderCompare() {
    const proc = getProcedure(state.procedureSlug);
    if (!proc) return;

    // Title, CPT, description
    const titleEl = document.querySelector('.cmp-title');
    const cptEl   = document.querySelector('.tag.cpt');
    const descEl  = document.querySelector('.cmp-desc');
    if (titleEl) titleEl.textContent = proc.name;
    if (cptEl)   cptEl.textContent   = `CPT ${proc.cpt}`;
    if (descEl)  descEl.textContent  = proc.description;

    // Tab on/off
    document.querySelectorAll('.ptab').forEach(t => {
      const tName = t.textContent.trim().toLowerCase();
      const isOn = (state.tab === 'gross' && tName === 'gross charge') ||
                   (state.tab === 'cash'  && tName === 'cash price');
      t.classList.toggle('on', isOn);
    });

    // Tab description blocks
    document.querySelectorAll('.tab-desc').forEach(td => {
      if (td.dataset.tab === state.tab) td.removeAttribute('hidden');
      else td.setAttribute('hidden', '');
    });

    // List head label
    const headLabel = document.querySelector('.list-head-l');
    if (headLabel) headLabel.textContent = state.tab === 'gross' ? 'Gross charge' : 'Cash price';

    // Compute ranking
    const ranks = rankPricesInRow(state.procedureSlug, priceField());

    // Sort
    let sorted = [...ranks];
    if (state.sortMode === 'asc') {
      sorted.sort((a, b) => {
        if (a.price == null) return 1;
        if (b.price == null) return -1;
        return a.price - b.price;
      });
    } else if (state.sortMode === 'desc') {
      sorted.sort((a, b) => {
        if (a.price == null) return 1;
        if (b.price == null) return -1;
        return b.price - a.price;
      });
    } else if (state.sortMode === 'name') {
      sorted.sort((a, b) => {
        const ha = getHospital(a.hospital_slug);
        const hb = getHospital(b.hospital_slug);
        return ha.name.localeCompare(hb.name);
      });
    }

    // Bar scaling
    const validPrices = sorted.filter(r => r.price != null).map(r => r.price);
    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 1;

    // Spread-bar
    updateSpreadBar(validPrices);

    // Render rows — replace existing .row elements
    const compareCol = document.querySelector('.col-compare');
    if (!compareCol) return;
    compareCol.querySelectorAll('.row').forEach(r => r.remove());

    const listHead = compareCol.querySelector('.list-head');
    if (!listHead) return;

    let html = '';
    sorted.forEach((r, idx) => {
      const h = getHospital(r.hospital_slug);
      if (!h) return;
      const rankNum = String(idx + 1).padStart(2, '0');
      const isLast  = idx === sorted.length - 1;
      const sel     = r.hospital_slug === state.hospitalSlug ? ' sel' : '';
      const fillCls = r.price != null ? `f-${r.rank}` : '';
      const colorCls = r.price != null ? `c-${r.rank}` : 'c-na';
      const fillW   = (r.price != null) ? (r.price / maxPrice * 100).toFixed(1) : 0;
      const priceText = formatPrice(r.price);
      const borderStyle = isLast ? ' style="border:none"' : '';
      html += `<div class="row${sel}" data-hospital="${escapeHtml(r.hospital_slug)}"${borderStyle}>` +
        `<span class="r-rank">${rankNum}</span>` +
        `<div class="r-name">${escapeHtml(h.name)}</div>` +
        `<div class="r-bar"><div class="r-fill ${fillCls}" style="width:${fillW}%"></div></div>` +
        `<div class="r-price ${colorCls}">${priceText}</div>` +
        `<div class="r-chevron">&#9656;</div>` +
        `</div>`;
    });
    listHead.insertAdjacentHTML('afterend', html);
  }

  function updateSpreadBar(validPrices) {
    const spread = document.querySelector('.spread-bar');
    if (!spread) return;
    if (validPrices.length === 0) {
      spread.style.display = 'none';
      return;
    }
    spread.style.display = '';
    const lo = Math.min(...validPrices);
    const hi = Math.max(...validPrices);
    const loEl   = spread.querySelector('.spread-v.lo');
    const hiEl   = spread.querySelector('.spread-v.hi');
    const metaEl = spread.querySelector('.spread-meta');
    if (loEl)   loEl.textContent   = formatPrice(lo);
    if (hiEl)   hiEl.textContent   = formatPrice(hi);
    if (metaEl) metaEl.textContent = lo > 0 ? `${(hi/lo).toFixed(1)}× DIFFERENCE` : '';
  }

  function renderDetails() {
    const h = getHospital(state.hospitalSlug);
    if (!h) return;
    const detName = document.querySelector('.det-name');
    const detDesc = document.querySelector('.det-desc');
    if (detName) detName.textContent = h.name;
    if (detDesc) detDesc.textContent = h.description;

    const props = document.querySelector('.det-props');
    if (props) {
      const websiteHtml = h.website
        ? `<a href="${escapeHtml(h.website)}" target="_blank" rel="noopener">${escapeHtml(shortDomain(h.website))}</a>`
        : '—';
      props.innerHTML = `
        <div class="det-prop-row">
          <span class="det-prop-l">Type</span>
          <span class="det-prop-v">${escapeHtml(h.type) || '—'}</span>
        </div>
        <div class="det-prop-row">
          <span class="det-prop-l">System</span>
          <span class="det-prop-v">${escapeHtml(h.system) || '—'}</span>
        </div>
        <div class="det-prop-row">
          <span class="det-prop-l">Address</span>
          <span class="det-prop-v">${escapeHtml(h.address) || '—'}</span>
        </div>
        <div class="det-prop-row">
          <span class="det-prop-l">Founded</span>
          <span class="det-prop-v">${escapeHtml(h.founded) || '—'}</span>
        </div>
        <div class="det-prop-row">
          <span class="det-prop-l">Website</span>
          <span class="det-prop-v">${websiteHtml}</span>
        </div>
      `;
    }
  }

  // ===== EVENT HANDLERS =====

  function wireHandlers() {
    // Category chips
    const chipsContainer = document.querySelector('.cat-chips');
    if (chipsContainer) {
      chipsContainer.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        const cat = chip.dataset.cat;
        if (!cat || cat === state.category) return;
        state.category = cat;
        // Pick first procedure in new category
        const procs = filterProceduresByCategory(cat);
        state.procedureSlug = procs.length > 0 ? procs[0].slug : null;
        // Update hospital to top-ranked for new procedure
        if (state.procedureSlug) {
          const ranks = rankPricesInRow(state.procedureSlug, priceField());
          const first = ranks.find(r => r.price != null);
          if (first) state.hospitalSlug = first.hospital_slug;
        }
        renderPicker();
        renderCompare();
        renderDetails();
      });
    }

    // Procedure list
    const procList = document.querySelector('.proc-list');
    if (procList) {
      procList.addEventListener('click', e => {
        const item = e.target.closest('.proc-item');
        if (!item) return;
        const slug = item.dataset.slug;
        if (!slug) return;
        state.procedureSlug = slug;
        // Switch category to match the selected procedure (relevant when picking from search)
        state.category = findCategoryForProcedure(slug);
        // Update hospital to top-ranked for this procedure
        const ranks = rankPricesInRow(state.procedureSlug, priceField());
        const first = ranks.find(r => r.price != null);
        if (first) state.hospitalSlug = first.hospital_slug;
        renderPicker();
        renderCompare();
        renderDetails();
      });
    }

    // Hospital row click
    const compareCol = document.querySelector('.col-compare');
    if (compareCol) {
      compareCol.addEventListener('click', e => {
        const row = e.target.closest('.row');
        if (!row) return;
        const slug = row.dataset.hospital;
        if (!slug) return;
        state.hospitalSlug = slug;
        document.querySelectorAll('.col-compare .row').forEach(r => {
          r.classList.toggle('sel', r.dataset.hospital === slug);
        });
        renderDetails();
      });
    }

    // Tab switch
    document.querySelectorAll('.ptab').forEach(t => {
      t.addEventListener('click', () => {
        const tName = t.textContent.trim().toLowerCase();
        if (tName === 'gross charge')      state.tab = 'gross';
        else if (tName === 'cash price')   state.tab = 'cash';
        renderCompare();
      });
    });

    // Sort cycle
    const sortPill = document.querySelector('.sort-pill');
    if (sortPill) {
      const labels = {
        asc:  'Lowest first',
        desc: 'Highest first',
        name: 'Hospital A→Z',
      };
      sortPill.addEventListener('click', () => {
        const modes = ['asc', 'desc', 'name'];
        const idx = modes.indexOf(state.sortMode);
        state.sortMode = modes[(idx + 1) % modes.length];
        sortPill.innerHTML = `${labels[state.sortMode]} <span class="caret">&#9662;</span>`;
        renderCompare();
      });
    }

    // Search box → upgrade .search-text div to <input>
    const searchBox = document.querySelector('.search-box');
    if (searchBox) {
      const textEl = searchBox.querySelector('.search-text');
      if (textEl && textEl.tagName !== 'INPUT') {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'search-text search-input';
        input.placeholder = 'Search procedures…';
        input.style.cssText = 'flex:1; background:transparent; border:none; outline:none; color:#E8EAED; font:inherit; padding:0;';
        textEl.replaceWith(input);
        input.addEventListener('input', e => {
          state.search = e.target.value;
          renderPicker();
        });
        document.addEventListener('keydown', e => {
          if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey &&
              document.activeElement !== input &&
              !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            input.focus();
          }
        });
      }
    }
  }

  // ===== INITIAL RENDER =====
  renderPicker();
  renderCompare();
  renderDetails();
  wireHandlers();
}

// ============================================================
// STUBS for other pages (Stages 4-6)
// ============================================================

function initPriceMapPage() {
  const state = {
    category: 'Radiology',
    tab:      'gross',
    sortMode: 'asc',  // 'asc' | 'desc' | 'name'
  };

  function priceField() {
    return state.tab === 'gross' ? 'gross' : 'cash';
  }

  // Read query string for cross-page navigation (optional pre-select)
  const qp = readQueryParams();
  if (qp.proc) {
    const proc = getProcedureByCpt(qp.proc);
    if (proc) state.category = findCategoryForProcedure(proc.slug);
  }

  // ===== RENDER =====

  function renderToolbar() {
    const chipsContainer = document.querySelector('.cat-chips');
    if (chipsContainer) {
      chipsContainer.innerHTML = UI_CATEGORIES.map(cat => {
        const cls = cat === state.category ? 'chip on' : 'chip';
        const dot = cat === state.category ? '<div class="chip-dot"></div>' : '';
        return `<div class="${cls}" data-cat="${escapeHtml(cat)}">${dot}${escapeHtml(cat)}</div>`;
      }).join('');
    }
    const procs = filterProceduresByCategory(state.category);
    const meta = document.querySelector('.toolbar-meta span');
    if (meta) {
      meta.innerHTML = `<b>${procs.length}</b> procedure${procs.length === 1 ? '' : 's'} &middot; <b>10</b> hospitals`;
    }
  }

  function renderSectionSub() {
    // Section-sub is now category-agnostic — nothing to update dynamically.
  }

  function renderTabs() {
    document.querySelectorAll('.ptab').forEach(t => {
      const tName = t.textContent.trim().toLowerCase();
      const isOn = (state.tab === 'gross' && tName === 'gross charge') ||
                   (state.tab === 'cash'  && tName === 'cash price');
      t.classList.toggle('on', isOn);
    });
    document.querySelectorAll('.tab-desc').forEach(td => {
      if (td.dataset.tab === state.tab) td.removeAttribute('hidden');
      else td.setAttribute('hidden', '');
    });
  }

  function renderMatrix() {
    let procs = filterProceduresByCategory(state.category);
    const tbody = document.querySelector('table.matrix tbody');
    if (!tbody) return;

    if (procs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:40px; color:#5F6973;">No procedures in this category.</td></tr>`;
      return;
    }

    // Sort rows by row-average price (or name)
    if (state.sortMode === 'name') {
      procs = [...procs].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      const procAvg = new Map();
      procs.forEach(p => {
        const ranks = rankPricesInRow(p.slug, priceField());
        const valid = ranks.filter(r => r.price != null).map(r => r.price);
        const avg = valid.length > 0 ? valid.reduce((s, v) => s + v, 0) / valid.length : Infinity;
        procAvg.set(p.slug, avg);
      });
      procs = [...procs].sort((a, b) => {
        const va = procAvg.get(a.slug);
        const vb = procAvg.get(b.slug);
        if (state.sortMode === 'asc') return va - vb;
        return vb - va;
      });
    }

    tbody.innerHTML = procs.map(proc => {
      const ranks = rankPricesInRow(proc.slug, priceField());
      const cellsHtml = ranks.map(r => {
        const colorCls = r.price != null ? `c-${r.rank}` : 'c-na';
        const priceText = r.price != null ? formatPrice(r.price) : '';
        return `<td class="cell ${colorCls}" data-hospital="${escapeHtml(r.hospital_slug)}" data-cpt="${escapeHtml(proc.cpt)}">${priceText}</td>`;
      }).join('');
      return `<tr>` +
        `<td class="proc-name" data-cpt="${escapeHtml(proc.cpt)}"><span class="pn">${escapeHtml(proc.name)}</span><span class="pc">CPT ${escapeHtml(proc.cpt)}</span></td>` +
        cellsHtml +
        `</tr>`;
    }).join('');
  }

  function computeHospitalStats() {
    const procs = filterProceduresByCategory(state.category);
    const stats = HOSPITAL_ORDER.map(h => ({ hospital: h, lo: 0, md: 0, hi: 0, na: 0, total: 0 }));
    procs.forEach(proc => {
      const ranks = rankPricesInRow(proc.slug, priceField());
      ranks.forEach((r, idx) => {
        stats[idx][r.rank]++;
        stats[idx].total++;
      });
    });
    return { stats, procsCount: procs.length };
  }

  function namesList(names, cls) {
    if (names.length === 0) return '';
    if (names.length === 1) return `<b class="${cls}">${escapeHtml(names[0])}</b>`;
    if (names.length === 2) return `<b class="${cls}">${escapeHtml(names[0])}</b> and <b class="${cls}">${escapeHtml(names[1])}</b>`;
    const head = names.slice(0, -1).map(n => `<b class="${cls}">${escapeHtml(n)}</b>`).join(', ');
    return `${head}, and <b class="${cls}">${escapeHtml(names[names.length - 1])}</b>`;
  }

  function renderStoryBlocks() {
    const { stats, procsCount } = computeHospitalStats();
    const cards = document.querySelectorAll('.story-card');
    if (cards.length < 2) return;

    if (procsCount === 0) {
      cards[0].querySelector('p').textContent = 'No data available for this category.';
      cards[1].querySelector('p').textContent = '';
      return;
    }

    const minDom = Math.ceil(procsCount * MIN_DOMINANCE_RATIO);
    const catLower = state.category.toLowerCase();

    // Helper: pick top hospitals where value >= minDom (max 3)
    function pickDominant(field) {
      return [...stats]
        .filter(s => s[field] >= minDom)
        .sort((a, b) => b[field] - a[field])
        .slice(0, 3);
    }

    // Card 1 — cheapest pattern
    const dominantLo = pickDominant('lo');
    const card1p = cards[0].querySelector('p');
    if (dominantLo.length === 0) {
      card1p.innerHTML = `No clear cheap pattern in this category — prices are mixed. Compare specific procedures in a column, or use column highlight to dig in.`;
    } else {
      const adj = dominantLo.length === 1 ? 'column is' : 'columns are';
      card1p.innerHTML = `${namesList(dominantLo.map(s => s.hospital.short), 'lo')} ${adj} almost entirely green — ${dominantLo.length === 1 ? 'this hospital' : 'these hospitals'} consistently rank${dominantLo.length === 1 ? 's' : ''} among the cheapest for ${escapeHtml(catLower)}.`;
    }

    // Card 2 — expensive pattern
    const dominantHi = pickDominant('hi');
    const card2p = cards[1].querySelector('p');
    if (dominantHi.length === 0) {
      card2p.innerHTML = `No clear expensive pattern in this category — prices are mixed.`;
    } else {
      const adj = dominantHi.length === 1 ? 'column is' : 'columns are';
      card2p.innerHTML = `${namesList(dominantHi.map(s => s.hospital.short), 'hi')} ${adj} almost entirely red. That answers the question: are some hospitals systematically more expensive than others?`;
    }
  }

  // ===== HIGHLIGHT =====

  function updateResetVisibility() {
    const resetBtn = document.getElementById('resetBtn');
    if (!resetBtn) return;
    const any = document.querySelector('.hl, .hl-col, .hl-row');
    if (any) resetBtn.removeAttribute('hidden');
    else resetBtn.setAttribute('hidden', '');
  }

  function clearAllHighlights() {
    document.querySelectorAll('.hl, .hl-col, .hl-row').forEach(el => {
      el.classList.remove('hl', 'hl-col', 'hl-row');
    });
    updateResetVisibility();
  }

  // ===== EVENT HANDLERS =====

  function wireHandlers() {
    // Category chips
    const chipsContainer = document.querySelector('.cat-chips');
    if (chipsContainer) {
      chipsContainer.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        const cat = chip.dataset.cat;
        if (!cat || cat === state.category) return;
        state.category = cat;
        clearAllHighlights();
        renderToolbar();
        renderSectionSub();
        renderMatrix();
        renderStoryBlocks();
      });
    }

    // Tab switch
    document.querySelectorAll('.ptab').forEach(t => {
      t.addEventListener('click', () => {
        const tName = t.textContent.trim().toLowerCase();
        if (tName === 'gross charge')    state.tab = 'gross';
        else if (tName === 'cash price') state.tab = 'cash';
        clearAllHighlights();
        renderTabs();
        renderMatrix();
        renderStoryBlocks();
      });
    });

    // Hospital column highlight — click on th
    const thead = document.querySelector('table.matrix thead');
    if (thead) {
      thead.addEventListener('click', e => {
        const th = e.target.closest('th.th-hosp');
        if (!th) return;
        th.classList.toggle('hl');
        const colIdx = parseInt(th.dataset.col, 10);
        const cssCol = colIdx + 1; // proc-name is 1st td
        document.querySelectorAll(`table.matrix tbody tr td:nth-child(${cssCol})`).forEach(td => {
          td.classList.toggle('hl-col');
        });
        updateResetVisibility();
      });
    }

    // Procedure row highlight + Cell click → navigate
    const tbody = document.querySelector('table.matrix tbody');
    if (tbody) {
      tbody.addEventListener('click', e => {
        // Procedure name → toggle row highlight
        const procName = e.target.closest('td.proc-name');
        if (procName) {
          procName.classList.toggle('hl');
          procName.parentElement.querySelectorAll('td.cell').forEach(td => td.classList.toggle('hl-row'));
          updateResetVisibility();
          return;
        }
        // Cell click → navigate to Compare with pre-selected proc + hospital
        const cell = e.target.closest('td.cell');
        if (cell && !cell.classList.contains('c-na')) {
          const cpt = cell.dataset.cpt;
          const hospital = cell.dataset.hospital;
          if (cpt && hospital) {
            saveStateForReturn();
            window.location.href = `index.html?proc=${encodeURIComponent(cpt)}&hospital=${encodeURIComponent(hospital)}`;
          }
        }
      });
    }

    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', clearAllHighlights);

    // Sort cycle
    const sortPill = document.querySelector('.sort-pill');
    if (sortPill) {
      const labels = {
        asc:  'Lowest first',
        desc: 'Highest first',
        name: 'Procedure A→Z',
      };
      sortPill.addEventListener('click', () => {
        const modes = ['asc', 'desc', 'name'];
        const idx = modes.indexOf(state.sortMode);
        state.sortMode = modes[(idx + 1) % modes.length];
        sortPill.innerHTML = `${labels[state.sortMode]} <span class="caret">&#9662;</span>`;
        renderMatrix();
      });
    }
  }

  // ===== STATE PERSISTENCE (back-navigation from Page 1) =====

  function saveStateForReturn() {
    const matrixWrap = document.querySelector('.matrix-wrap');
    const highlightedCols = Array.from(document.querySelectorAll('th.th-hosp.hl'))
      .map(th => parseInt(th.dataset.col, 10));
    const highlightedRows = Array.from(document.querySelectorAll('td.proc-name.hl'))
      .map(td => td.dataset.cpt);
    const snapshot = {
      category: state.category,
      tab: state.tab,
      sortMode: state.sortMode,
      scrollTop: matrixWrap ? matrixWrap.scrollTop : 0,
      highlightedCols,
      highlightedRows,
      ts: Date.now(),
    };
    try { sessionStorage.setItem('priceMapState', JSON.stringify(snapshot)); }
    catch (e) { console.warn('[price-map] sessionStorage save failed', e); }
  }

  function restoreStateIfAny() {
    let snapshot = null;
    try {
      const raw = sessionStorage.getItem('priceMapState');
      if (raw) snapshot = JSON.parse(raw);
    } catch (e) { return false; }
    if (!snapshot) return false;
    // Only restore if recent (< 30 min) — otherwise user probably forgot
    if (Date.now() - (snapshot.ts || 0) > 30 * 60 * 1000) {
      sessionStorage.removeItem('priceMapState');
      return false;
    }
    if (snapshot.category) state.category = snapshot.category;
    if (snapshot.tab)      state.tab = snapshot.tab;
    if (snapshot.sortMode) state.sortMode = snapshot.sortMode;
    sessionStorage.removeItem('priceMapState');
    return snapshot;
  }

  function applyHighlightsAndScroll(snapshot) {
    if (!snapshot) return;
    // Restore column highlights
    (snapshot.highlightedCols || []).forEach(colIdx => {
      const th = document.querySelector(`th.th-hosp[data-col="${colIdx}"]`);
      if (th) {
        th.classList.add('hl');
        const cssCol = colIdx + 1;
        document.querySelectorAll(`table.matrix tbody tr td:nth-child(${cssCol})`).forEach(td => {
          td.classList.add('hl-col');
        });
      }
    });
    // Restore row highlights
    (snapshot.highlightedRows || []).forEach(cpt => {
      const procNameTd = document.querySelector(`td.proc-name[data-cpt="${cpt}"]`);
      if (procNameTd) {
        procNameTd.classList.add('hl');
        procNameTd.parentElement.querySelectorAll('td.cell').forEach(td => td.classList.add('hl-row'));
      }
    });
    // Update reset visibility
    updateResetVisibility();
    // Scroll position
    const matrixWrap = document.querySelector('.matrix-wrap');
    if (matrixWrap && snapshot.scrollTop) matrixWrap.scrollTop = snapshot.scrollTop;
    // Update sort-pill label
    const sortPill = document.querySelector('.sort-pill');
    if (sortPill) {
      const labels = { asc: 'Lowest first', desc: 'Highest first', name: 'Procedure A→Z' };
      sortPill.innerHTML = `${labels[state.sortMode]} <span class="caret">&#9662;</span>`;
    }
  }

  // ===== INITIAL RENDER =====
  const restored = restoreStateIfAny();
  renderToolbar();
  renderSectionSub();
  renderTabs();
  renderMatrix();
  renderStoryBlocks();
  wireHandlers();
  applyHighlightsAndScroll(restored);
}
function initInsurerRatesPage() {
  const state = {
    category:      'Radiology',
    procedureSlug: null,
    hospitalSlug:  null,
    tab:           'min',   // 'min' | 'max'
    sortMode:      'asc',
    search:        '',
  };

  function rateField() {
    return state.tab === 'min' ? 'min_neg' : 'max_neg';
  }

  // Pick initial procedure
  if (!state.procedureSlug) {
    const procs = filterProceduresByCategory(state.category);
    if (procs.length > 0) state.procedureSlug = procs[0].slug;
  }
  if (!state.hospitalSlug && state.procedureSlug) {
    const ranks = rankPricesInRow(state.procedureSlug, rateField());
    const first = ranks.find(r => r.price != null);
    state.hospitalSlug = first ? first.hospital_slug : HOSPITAL_ORDER[0].slug;
  }

  function matchSearch(proc, q) {
    if (!q) return true;
    const lq = q.toLowerCase();
    return proc.name.toLowerCase().includes(lq) || (proc.cpt && proc.cpt.includes(q));
  }

  // ===== RENDER =====

  function renderPicker() {
    const isSearching = state.search && state.search.trim().length > 0;
    let procs;
    if (isSearching) {
      procs = STATE.procedures.filter(p => matchSearch(p, state.search));
    } else {
      procs = filterProceduresByCategory(state.category);
    }

    const matchedCats = new Set();
    if (isSearching) {
      procs.forEach(p => {
        for (const uiCat of UI_CATEGORIES) {
          const dataCats = CATEGORY_MAPPING[uiCat];
          if (p.categories && p.categories.some(c => dataCats.includes(c))) {
            matchedCats.add(uiCat);
          }
        }
      });
    }

    const chipsContainer = document.querySelector('.cat-chips');
    if (chipsContainer) {
      chipsContainer.innerHTML = UI_CATEGORIES.map(cat => {
        const classes = ['chip'];
        if (cat === state.category) classes.push('on');
        if (isSearching && matchedCats.has(cat)) classes.push('has-match');
        const dot = cat === state.category ? '<div class="chip-dot"></div>' : '';
        return `<div class="${classes.join(' ')}" data-cat="${escapeHtml(cat)}">${dot}${escapeHtml(cat)}</div>`;
      }).join('');
    }

    const countEl = document.querySelector('.cat-count');
    if (countEl) {
      if (isSearching) {
        countEl.textContent = `${procs.length} match${procs.length === 1 ? '' : 'es'} across all categories`;
      } else {
        countEl.textContent = `${procs.length} procedure${procs.length === 1 ? '' : 's'} in this category`;
      }
    }

    const listEl = document.querySelector('.proc-list');
    if (listEl) {
      listEl.innerHTML = procs.map(p => {
        const sel = p.slug === state.procedureSlug ? ' sel' : '';
        return `<div class="proc-item${sel}" data-slug="${escapeHtml(p.slug)}">
          <div class="proc-name">${escapeHtml(p.name)}</div>
          <div class="proc-cpt">CPT ${escapeHtml(p.cpt)}</div>
        </div>`;
      }).join('');
    }
  }

  function renderCompare() {
    const proc = getProcedure(state.procedureSlug);
    if (!proc) return;

    const titleEl = document.querySelector('.cmp-title');
    const cptEl   = document.querySelector('.tag.cpt');
    const descEl  = document.querySelector('.cmp-desc');
    if (titleEl) titleEl.textContent = proc.name;
    if (cptEl)   cptEl.textContent   = `CPT ${proc.cpt}`;
    if (descEl)  descEl.textContent  = proc.description;

    // Tabs
    document.querySelectorAll('.ptab').forEach(t => {
      const tName = t.textContent.trim().toLowerCase();
      const isOn = (state.tab === 'min' && tName === 'min negotiated') ||
                   (state.tab === 'max' && tName === 'max negotiated');
      t.classList.toggle('on', isOn);
    });

    // Tab descriptions
    document.querySelectorAll('.tab-desc').forEach(td => {
      if (td.dataset.tab === state.tab) td.removeAttribute('hidden');
      else td.setAttribute('hidden', '');
    });

    // List head label
    const headLabel = document.querySelector('.list-head-l');
    if (headLabel) headLabel.textContent = state.tab === 'min' ? 'Min negotiated rate' : 'Max negotiated rate';

    // Compute rows (no rank colors — neutral palette)
    const items = HOSPITAL_ORDER.map(h => {
      const pr = getPrice(h.slug, state.procedureSlug);
      return {
        hospital_slug: h.slug,
        price: (pr && pr[rateField()] != null) ? pr[rateField()] : null,
      };
    });

    // Sort
    let sorted = [...items];
    if (state.sortMode === 'asc') {
      sorted.sort((a, b) => {
        if (a.price == null) return 1;
        if (b.price == null) return -1;
        return a.price - b.price;
      });
    } else if (state.sortMode === 'desc') {
      sorted.sort((a, b) => {
        if (a.price == null) return 1;
        if (b.price == null) return -1;
        return b.price - a.price;
      });
    } else if (state.sortMode === 'name') {
      sorted.sort((a, b) => {
        const ha = getHospital(a.hospital_slug);
        const hb = getHospital(b.hospital_slug);
        return ha.name.localeCompare(hb.name);
      });
    }

    const validPrices = sorted.filter(r => r.price != null).map(r => r.price);
    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 1;

    // Render rows
    const compareCol = document.querySelector('.col-compare');
    if (!compareCol) return;
    compareCol.querySelectorAll('.row').forEach(r => r.remove());

    const listHead = compareCol.querySelector('.list-head');
    if (!listHead) return;

    let html = '';
    sorted.forEach((r, idx) => {
      const h = getHospital(r.hospital_slug);
      if (!h) return;
      const rankNum = String(idx + 1).padStart(2, '0');
      const isLast  = idx === sorted.length - 1;
      const sel     = r.hospital_slug === state.hospitalSlug ? ' sel' : '';
      const fillW   = (r.price != null) ? (r.price / maxPrice * 100).toFixed(1) : 0;
      const priceText = formatPrice(r.price);
      const borderStyle = isLast ? ' style="border:none"' : '';
      // No chevron on Page 3 (clicking a row doesn't navigate, just updates Details)
      html += `<div class="row${sel}" data-hospital="${escapeHtml(r.hospital_slug)}"${borderStyle}>` +
        `<span class="r-rank">${rankNum}</span>` +
        `<div class="r-name">${escapeHtml(h.name)}</div>` +
        `<div class="r-bar"><div class="r-fill f-neutral" style="width:${fillW}%"></div></div>` +
        `<div class="r-price c-neutral">${priceText}</div>` +
        `</div>`;
    });
    listHead.insertAdjacentHTML('afterend', html);
  }

  function renderDetails() {
    const h = getHospital(state.hospitalSlug);
    if (!h) return;
    const detName = document.querySelector('.det-name');
    const detDesc = document.querySelector('.det-desc');
    if (detName) detName.textContent = h.name;
    if (detDesc) detDesc.textContent = h.description;

    // Rate card — always shows BOTH min and max for current pair
    const pr = state.procedureSlug ? getPrice(h.slug, state.procedureSlug) : null;
    const minVal = pr && pr.min_neg != null ? formatPrice(pr.min_neg) : '—';
    const maxVal = pr && pr.max_neg != null ? formatPrice(pr.max_neg) : '—';
    const rateRows = document.querySelectorAll('.det-rate-row .det-rate-val');
    if (rateRows.length >= 2) {
      rateRows[0].textContent = minVal;
      rateRows[1].textContent = maxVal;
    }

    const props = document.querySelector('.det-props');
    if (props) {
      const websiteHtml = h.website
        ? `<a href="${escapeHtml(h.website)}" target="_blank" rel="noopener">${escapeHtml(shortDomain(h.website))}</a>`
        : '—';
      props.innerHTML = `
        <div class="det-prop-row">
          <span class="det-prop-l">Type</span>
          <span class="det-prop-v">${escapeHtml(h.type) || '—'}</span>
        </div>
        <div class="det-prop-row">
          <span class="det-prop-l">System</span>
          <span class="det-prop-v">${escapeHtml(h.system) || '—'}</span>
        </div>
        <div class="det-prop-row">
          <span class="det-prop-l">Address</span>
          <span class="det-prop-v">${escapeHtml(h.address) || '—'}</span>
        </div>
        <div class="det-prop-row">
          <span class="det-prop-l">Founded</span>
          <span class="det-prop-v">${escapeHtml(h.founded) || '—'}</span>
        </div>
        <div class="det-prop-row">
          <span class="det-prop-l">Website</span>
          <span class="det-prop-v">${websiteHtml}</span>
        </div>
      `;
    }
  }

  // ===== HANDLERS =====

  function wireHandlers() {
    const chipsContainer = document.querySelector('.cat-chips');
    if (chipsContainer) {
      chipsContainer.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        const cat = chip.dataset.cat;
        if (!cat || cat === state.category) return;
        state.category = cat;
        const procs = filterProceduresByCategory(cat);
        state.procedureSlug = procs.length > 0 ? procs[0].slug : null;
        if (state.procedureSlug) {
          const ranks = rankPricesInRow(state.procedureSlug, rateField());
          const first = ranks.find(r => r.price != null);
          if (first) state.hospitalSlug = first.hospital_slug;
        }
        renderPicker();
        renderCompare();
        renderDetails();
      });
    }

    const procList = document.querySelector('.proc-list');
    if (procList) {
      procList.addEventListener('click', e => {
        const item = e.target.closest('.proc-item');
        if (!item) return;
        const slug = item.dataset.slug;
        if (!slug) return;
        state.procedureSlug = slug;
        state.category = findCategoryForProcedure(slug);
        const ranks = rankPricesInRow(state.procedureSlug, rateField());
        const first = ranks.find(r => r.price != null);
        if (first) state.hospitalSlug = first.hospital_slug;
        renderPicker();
        renderCompare();
        renderDetails();
      });
    }

    const compareCol = document.querySelector('.col-compare');
    if (compareCol) {
      compareCol.addEventListener('click', e => {
        const row = e.target.closest('.row');
        if (!row) return;
        const slug = row.dataset.hospital;
        if (!slug) return;
        state.hospitalSlug = slug;
        document.querySelectorAll('.col-compare .row').forEach(r => {
          r.classList.toggle('sel', r.dataset.hospital === slug);
        });
        renderDetails();
      });
    }

    document.querySelectorAll('.ptab').forEach(t => {
      t.addEventListener('click', () => {
        const tName = t.textContent.trim().toLowerCase();
        if (tName === 'min negotiated')      state.tab = 'min';
        else if (tName === 'max negotiated') state.tab = 'max';
        renderCompare();
      });
    });

    const sortPill = document.querySelector('.sort-pill');
    if (sortPill) {
      const labels = {
        asc:  'Lowest first',
        desc: 'Highest first',
        name: 'Hospital A→Z',
      };
      sortPill.addEventListener('click', () => {
        const modes = ['asc', 'desc', 'name'];
        const idx = modes.indexOf(state.sortMode);
        state.sortMode = modes[(idx + 1) % modes.length];
        sortPill.innerHTML = `${labels[state.sortMode]} <span class="caret">&#9662;</span>`;
        renderCompare();
      });
    }

    const searchBox = document.querySelector('.search-box');
    if (searchBox) {
      const textEl = searchBox.querySelector('.search-text');
      if (textEl && textEl.tagName !== 'INPUT') {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'search-text search-input';
        input.placeholder = 'Search procedures…';
        input.style.cssText = 'flex:1; background:transparent; border:none; outline:none; color:#E8EAED; font:inherit; padding:0;';
        textEl.replaceWith(input);
        input.addEventListener('input', e => {
          state.search = e.target.value;
          renderPicker();
        });
        document.addEventListener('keydown', e => {
          if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey &&
              document.activeElement !== input &&
              !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            input.focus();
          }
        });
      }
    }
  }

  renderPicker();
  renderCompare();
  renderDetails();
  wireHandlers();
}
function initAboutPage()         { console.log('[about] stub'); }
