const state = {
  dir: null,
  discovered: [],
  plans: [],
  activeFile: null,
  collapsedGroups: new Set(),
};

const browseState = { path: null, parent: null };

const els = {
  sidebar: document.getElementById('sidebar'),
  sidebarEmpty: document.getElementById('sidebar-empty'),
  detail: document.getElementById('detail'),
  folderSelect: document.getElementById('folder-select'),
  folderBrowse: document.getElementById('folder-browse'),
  search: document.getElementById('search'),
  themeToggle: document.getElementById('theme-toggle'),
  toast: document.getElementById('toast'),
  caseBackdrop: document.getElementById('case-backdrop'),
  confettiLayer: document.getElementById('confetti-layer'),
  browseModal: document.getElementById('browse-modal'),
  browseClose: document.getElementById('browse-close'),
  browseBreadcrumb: document.getElementById('browse-breadcrumb'),
  browseList: document.getElementById('browse-list'),
  browseCurrent: document.getElementById('browse-current'),
  browseSelect: document.getElementById('browse-select'),
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatInline(raw) {
  if (!raw) return '';
  let s = escapeHtml(raw);
  s = s.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
  s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_m, _t, label) => `<span class="wikilink">${label}</span>`);
  s = s.replace(/\[\[([^\]]+)\]\]/g, (_m, target) => `<span class="wikilink">${target}</span>`);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  return s;
}

function toast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle('error', isError);
  els.toast.hidden = false;
  requestAnimationFrame(() => els.toast.classList.add('show'));
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    els.toast.classList.remove('show');
    setTimeout(() => (els.toast.hidden = true), 200);
  }, 2600);
}

async function api(pathname, opts) {
  const res = await fetch(pathname, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur HTTP ${res.status}`);
  }
  return res.json();
}

function statusClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('stable')) return 'status-stable';
  if (s.includes('jouer')) return 'status-a-jouer';
  if (s.includes('obsol') || s.includes('archiv')) return 'status-obsolete';
  return 'status-default';
}

// ---------------------------------------------------------------------------
// Confettis 🎉 — petites particules DOM éphémères, pas de dépendance externe.
// ---------------------------------------------------------------------------
const CONFETTI_EMOJI = ['🎉', '✨', '⭐', '🎊', '💥', '🌟', '🏅'];

function spawnConfetti(x, y, { count = 14, spread = 130, big = false } = {}) {
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'confetti-piece';
    span.textContent = CONFETTI_EMOJI[Math.floor(Math.random() * CONFETTI_EMOJI.length)];
    const angle = ((Math.random() * spread - spread / 2) * Math.PI) / 180 - Math.PI / 2;
    const dist = (big ? 120 : 50) + Math.random() * (big ? 220 : 100);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const rot = (Math.random() * 720 - 360).toFixed(0);
    const size = (big ? 18 : 13) + Math.random() * (big ? 16 : 9);
    const duration = 700 + Math.random() * 500;
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    span.style.fontSize = `${size}px`;
    span.style.animationDuration = `${duration}ms`;
    span.style.setProperty('--dx', `${dx}px`);
    span.style.setProperty('--dy', `${dy}px`);
    span.style.setProperty('--rot', `${rot}deg`);
    span.addEventListener('animationend', () => span.remove());
    els.confettiLayer.appendChild(span);
  }
}

function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// navigator.clipboard n'existe qu'en contexte sécurisé (localhost ou https) :
// si l'outil est ouvert via une IP du réseau local, on retombe sur la méthode
// historique (textarea hors écran + execCommand).
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (!ok) throw new Error('copie refusée par le navigateur');
}

// ---------------------------------------------------------------------------
// Anneau de progression SVG réutilisable (sidebar, en-tête de plan, chapitres)
// ---------------------------------------------------------------------------
function ringSVG(pct, { size = 44, stroke = 5, label = null } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  const center = size / 2;
  const text = label == null ? `${pct}%` : label;
  return `<svg class="ring ${pct >= 100 ? 'ring-complete' : ''}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle class="ring-track" cx="${center}" cy="${center}" r="${r}" stroke-width="${stroke}" fill="none" />
    <circle class="ring-fill" cx="${center}" cy="${center}" r="${r}" stroke-width="${stroke}" fill="none"
      stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
      transform="rotate(-90 ${center} ${center})" />
    <text x="50%" y="52%" class="ring-label" style="font-size:${Math.max(9, size * 0.24)}px">${escapeHtml(String(text))}</text>
  </svg>`;
}

function pctOf(stats) {
  return stats.total ? Math.round((stats.checked / stats.total) * 100) : 0;
}

// ---------------------------------------------------------------------------
// Sidebar — liste des plans de test
// ---------------------------------------------------------------------------
function renderSidebar() {
  const q = els.search.value.trim().toLowerCase();
  els.sidebar.innerHTML = '';
  const filtered = state.plans.filter((p) => {
    if (!q) return true;
    const haystack = [p.title, p.meta.ticket, p.meta.domain, p.meta.status, ...(p.meta.tags || [])]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'sidebar-empty';
    empty.textContent = state.plans.length === 0 ? 'Aucun plan de test dans ce dossier.' : 'Aucun résultat.';
    els.sidebar.appendChild(empty);
    return;
  }

  for (const plan of filtered) {
    const pct = pctOf(plan.stats);
    const card = document.createElement('div');
    card.className = 'plan-card' + (plan.fileName === state.activeFile ? ' active' : '') + (pct === 100 ? ' plan-complete' : '');
    card.dataset.file = plan.fileName;
    card.innerHTML = `
      <div class="plan-card-ring">${ringSVG(pct, { size: 46, stroke: 5 })}</div>
      <div class="plan-card-body">
        <div class="plan-card-top">
          <span class="plan-ticket">${escapeHtml(plan.meta.ticket || '—')}</span>
          <span class="status-pill ${statusClass(plan.meta.status)}">${escapeHtml(plan.meta.status || '')}</span>
        </div>
        <div class="plan-title">${escapeHtml(plan.title)}</div>
        <div class="plan-meta">
          <span class="plan-domain">${escapeHtml(plan.meta.domain || '')}</span>
          <span>${plan.stats.checked}/${plan.stats.total} CT</span>
        </div>
      </div>
    `;
    card.addEventListener('click', () => selectPlan(plan.fileName));
    els.sidebar.appendChild(card);
  }
}

function updateSidebarCard(plan) {
  const card = els.sidebar.querySelector(`.plan-card[data-file="${CSS.escape(plan.fileName)}"]`);
  if (!card) return renderSidebar();
  const pct = pctOf(plan.stats);
  card.classList.toggle('plan-complete', pct === 100);
  card.querySelector('.plan-card-ring').innerHTML = ringSVG(pct, { size: 46, stroke: 5 });
  card.querySelector('.plan-title').innerHTML = `${escapeHtml(plan.title)}`;
  card.querySelector('.plan-meta span:last-child').textContent = `${plan.stats.checked}/${plan.stats.total} CT`;
}

// ---------------------------------------------------------------------------
// Détail d'un plan — tableaux / callouts génériques (pré-requis, couverture…)
// ---------------------------------------------------------------------------
function renderTable(table) {
  if (!table) return '';
  const rows = table.rows.map((r) => `<tr>${r.map((c) => `<td>${formatInline(c)}</td>`).join('')}</tr>`).join('');
  return `<table class="doc-table">
    <thead><tr>${table.header.map((h) => `<th>${formatInline(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderCallout(callout) {
  if (!callout) return '';
  const cls = callout.type === 'warning' ? 'warning' : 'tip';
  const hasBullets = callout.items.some((i) => i.bullet);
  const body = hasBullets
    ? `<ul>${callout.items.map((i) => `<li>${formatInline(i.text)}</li>`).join('')}</ul>`
    : callout.items.map((i) => `<p>${formatInline(i.text)}</p>`).join('');
  return `<div class="callout ${cls}">
    <div class="callout-title">${escapeHtml(callout.title)}</div>
    ${body}
  </div>`;
}

// ---------------------------------------------------------------------------
// Cartes de cas de test (CT) — cartes à retourner (flip) + tampon de validation
// ---------------------------------------------------------------------------
// Le gabarit n'impose pas de colonne « cas » dans « Anomalies constatées » :
// on cherche donc les identifiants CT-nn dans toutes les cellules de la ligne,
// que la référence soit dans une colonne dédiée ou dans la description.
const CT_REF_RE = /\bCT-\d+\b/g;

function anomaliesByCase(anomalies) {
  const map = new Map();
  if (!anomalies) return map;
  for (const row of anomalies.rows) {
    const ids = new Set();
    for (const cell of row) {
      for (const m of String(cell).matchAll(CT_REF_RE)) ids.add(m[0]);
    }
    for (const id of ids) {
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(row);
    }
  }
  return map;
}

// Une ligne d'anomalie rendue en « En-tête : valeur », cellules vides ignorées
// et référence au CT omise (redondante dans la carte du cas concerné).
function renderAnomalyRow(header, row, ctId) {
  const parts = [];
  row.forEach((cell, i) => {
    const text = String(cell).trim();
    if (!text || text === ctId) return;
    const label = header[i] ? `<b>${formatInline(header[i])} :</b> ` : '';
    parts.push(`${label}${formatInline(text)}`);
  });
  return `<li>${parts.join(' — ')}</li>`;
}

function renderCaseAnomalies(rows, header, ctId) {
  if (!rows || rows.length === 0) return '';
  return `<div class="callout warning case-anomaly">
    <div class="callout-title">${rows.length > 1 ? 'Anomalies constatées' : 'Anomalie constatée'}</div>
    <ul>${rows.map((r) => renderAnomalyRow(header, r, ctId)).join('')}</ul>
  </div>`;
}

function renderCase(kase, chapterTitle, anomalies) {
  const stepsHtml = kase.steps ? renderTable(kase.steps) : '<p class="case-no-steps">Pas d\'étapes détaillées.</p>';
  const preHtml = kase.precondition
    ? `<div class="callout tip case-precondition"><div class="callout-title">Pré-condition</div><p>${formatInline(kase.precondition)}</p></div>`
    : '';
  const anomalyRows = anomalies ? anomalies.byCase.get(kase.id) : null;
  const anomalyHtml = anomalyRows ? renderCaseAnomalies(anomalyRows, anomalies.header, kase.id) : '';
  const hasAnomaly = Boolean(anomalyRows && anomalyRows.length);
  return `<div class="case-card ${kase.checked ? 'checked' : ''} ${hasAnomaly ? 'has-anomaly' : ''}" data-ct="${escapeHtml(kase.id)}">
    <div class="case-card-inner">
      <div class="case-face case-front">
        <div class="case-face-top">
          <span class="case-chip">${escapeHtml(kase.id)}</span>
          ${hasAnomaly ? '<span class="anomaly-flag" title="Anomalie constatée sur ce cas">anomalie</span>' : ''}
        </div>
        <div class="case-front-title">${formatInline(kase.title)}</div>
        <button type="button" class="stamp" title="${kase.checked ? 'Marquer à refaire' : 'Marquer comme validé'}">
          <span class="stamp-icon">${kase.checked ? '✅' : '⬜'}</span>
        </button>
      </div>
      <div class="case-face case-back">
        <div class="case-face-top">
          <span class="case-chapter" title="${escapeHtml(chapterTitle)}">${escapeHtml(chapterTitle)}</span>
          <button type="button" class="case-chip case-chip-copy" title="Cliquer pour copier l'identifiant">${escapeHtml(kase.id)}</button>
          <button type="button" class="flip-btn" title="Fermer">✕</button>
        </div>
        <div class="case-back-title">${formatInline(kase.title)}</div>
        <div class="case-back-scroll">
          ${preHtml}
          ${stepsHtml}
          ${anomalyHtml}
        </div>
        <div class="case-actions">
          <button type="button" class="btn-nav btn-prev">‹ Précédent</button>
          <button type="button" class="btn-validate ${kase.checked ? 'is-done' : ''}">
            ${kase.checked ? '↺ Marquer à refaire' : 'Valider ce cas'}
          </button>
          <button type="button" class="btn-nav btn-next">Suivant ›</button>
        </div>
      </div>
    </div>
  </div>`;
}

// Une seule carte agrandie à la fois : le verso passe en overlay centré, la
// tuile d'origine garde sa place dans la grille (pas de reflow).
let zoomedCard = null;

const NAV_CLASSES = ['zoomed', 'nav-next', 'nav-prev'];

function closeZoomedCase() {
  if (zoomedCard) zoomedCard.classList.remove(...NAV_CLASSES);
  zoomedCard = null;
  els.caseBackdrop.hidden = true;
  writeUrlState();
}

// dir : 'next' | 'prev' | null — pilote le sens du glissement d'entrée.
function openZoomedCase(card, dir = null) {
  if (zoomedCard === card) return closeZoomedCase();
  if (zoomedCard) zoomedCard.classList.remove(...NAV_CLASSES);

  // Un chapitre replié met sa grille en `display: none`, ce qui empêche tout
  // rendu de la carte — même en `position: fixed`. Il faut donc le déplier,
  // sinon la navigation Précédent/Suivant vers ce chapitre n'afficherait rien.
  const chapter = card.closest('.chapter');
  if (chapter && chapter.classList.contains('collapsed')) {
    chapter.classList.remove('collapsed');
    state.collapsedGroups.delete(chapter.dataset.group);
  }

  zoomedCard = card;
  card.classList.remove('nav-next', 'nav-prev');
  if (dir) card.classList.add(dir === 'next' ? 'nav-next' : 'nav-prev');
  card.classList.add('zoomed');
  els.caseBackdrop.hidden = false;
  writeUrlState();
}

function groupCounts(cases) {
  const total = cases.length;
  const checked = cases.filter((c) => c.checked).length;
  return { total, checked };
}

function renderChapter(group, key, isNonReg, anomalies) {
  const { total, checked } = groupCounts(group.cases);
  const pct = total ? Math.round((checked / total) * 100) : 0;
  const collapsed = state.collapsedGroups.has(key);
  return `<section class="chapter ${isNonReg ? 'chapter-nonreg' : ''} ${pct === 100 && total > 0 ? 'complete' : ''} ${collapsed ? 'collapsed' : ''}" data-group="${key}">
    <header class="chapter-header">
      <span class="chapter-chevron">▾</span>
      <h3 class="chapter-title">${escapeHtml(group.title)}</h3>
      ${isNonReg ? '<span class="chapter-tag">non-régression</span>' : ''}
      <span class="chapter-ring">${ringSVG(pct, { size: 38, stroke: 4, label: `${checked}/${total}` })}</span>
    </header>
    <div class="case-grid">
      ${group.cases.map((kase) => renderCase(kase, group.title, anomalies)).join('')}
    </div>
  </section>`;
}

function getGroupByKey(plan, key) {
  if (key === 'non-reg') return plan.nonRegression;
  const idx = Number(key.slice(1));
  return plan.groups[idx];
}

function levelInfo(pct) {
  const level = Math.min(10, Math.floor(pct / 10));
  return { level, next: Math.min(100, (level + 1) * 10) };
}

function renderHero(plan) {
  const pct = pctOf(plan.stats);
  const { level } = levelInfo(pct);
  const tagsHtml = (plan.meta.tags || []).map((t) => `<span class="badge">${escapeHtml(t)}</span>`).join('');

  // Les trois lignes de cadrage forment un seul bloc : `.info-panel-body` espace
  // les blocs entre eux, pas chaque ligne d'un même bloc.
  const infoBits = [
    plan.info.objet ? `<p class="info-line"><b>Objet —</b> ${formatInline(plan.info.objet)}</p>` : '',
    plan.info.fonctionnalites ? `<p class="info-line"><b>Fonctionnalités couvertes —</b> ${formatInline(plan.info.fonctionnalites)}</p>` : '',
    plan.info.horsPerimetre ? `<p class="info-line"><b>Hors périmètre —</b> ${formatInline(plan.info.horsPerimetre)}</p>` : '',
  ].join('');
  const infoMetaHtml = infoBits ? `<div class="info-block">${infoBits}</div>` : '';

  const preReqHtml = plan.preRequis
    ? `<div class="info-block"><h4>Pré-requis</h4>${renderTable(plan.preRequis.table)}${renderCallout(plan.preRequis.tip)}</div>`
    : '';
  const couvertureHtml = plan.couverture ? `<div class="info-block"><h4>Couverture</h4>${renderTable(plan.couverture)}</div>` : '';

  const hasInfo = infoMetaHtml || preReqHtml || couvertureHtml;
  const infoPanel = hasInfo
    ? `<details class="info-panel">
        <summary>Détails du plan</summary>
        <div class="info-panel-body">${infoMetaHtml}${preReqHtml}${couvertureHtml}</div>
      </details>`
    : '';

  const limitesHtml = plan.limites ? `<div class="info-block"><h4>Limites du test</h4>${renderCallout(plan.limites)}</div>` : '';
  const anomaliesHtml = plan.anomalies ? `<div class="info-block"><h4>Anomalies constatées</h4>${renderTable(plan.anomalies)}</div>` : '';
  const extrasPanel =
    limitesHtml || anomaliesHtml
      ? `<details class="info-panel">
          <summary>Limites &amp; anomalies</summary>
          <div class="info-panel-body">${limitesHtml}${anomaliesHtml}</div>
        </details>`
      : '';

  return `
    <div class="hero">
      <div class="hero-top">
        <div>
          <h1>${escapeHtml(plan.title)}</h1>
          <div class="detail-badges">
            <span class="badge">${escapeHtml(plan.meta.ticket || '')}</span>
            <span class="status-pill ${statusClass(plan.meta.status)}">${escapeHtml(plan.meta.status || '')}</span>
            <span class="badge">${escapeHtml(plan.meta.domain || '')}</span>
            <span class="badge">${escapeHtml(plan.meta.date || '')}</span>
            ${tagsHtml}
          </div>
        </div>
        <div class="hero-ring">${ringSVG(pct, { size: 88, stroke: 8, label: `${pct}%` })}</div>
      </div>

      <div class="xp-bar-wrap">
        <div class="xp-level-chip">Niveau ${level} <span class="xp-level-max">/ 10</span></div>
        <div class="xp-bar">
          <div class="xp-bar-fill" style="width:${pct}%"></div>
          <span class="xp-rocket" style="left:${pct}%">🚀</span>
        </div>
        <div class="xp-count">${plan.stats.checked}/${plan.stats.total} CT validés</div>
      </div>

      ${infoPanel}
      ${extrasPanel}
    </div>
  `;
}

function renderDetail(plan) {
  closeZoomedCase(); // le DOM est remplacé : toute carte agrandie devient obsolète
  const anomalies = plan.anomalies
    ? { header: plan.anomalies.header, byCase: anomaliesByCase(plan.anomalies) }
    : null;
  const groupsHtml = plan.groups.map((g, idx) => renderChapter(g, `g${idx}`, false, anomalies)).join('');
  const nonRegHtml = plan.nonRegression ? renderChapter(plan.nonRegression, 'non-reg', true, anomalies) : '';

  els.detail.innerHTML = `
    <div class="detail-inner">
      ${renderHero(plan)}
      <section class="plan-board">
        ${groupsHtml}
        ${nonRegHtml}
      </section>
    </div>
  `;

  els.detail.querySelectorAll('.chapter-header').forEach((header) => {
    header.addEventListener('click', () => {
      const chapter = header.closest('.chapter');
      const key = chapter.dataset.group;
      chapter.classList.toggle('collapsed');
      if (chapter.classList.contains('collapsed')) state.collapsedGroups.add(key);
      else state.collapsedGroups.delete(key);
    });
  });

  // Ordre du document = ordre de lecture du plan : la navigation
  // Précédent/Suivant traverse les chapitres, non-régression incluse.
  const cards = Array.from(els.detail.querySelectorAll('.case-card'));
  cards.forEach((card, idx) => {
    const ctId = card.dataset.ct;

    // Tout le recto est cliquable ; le tampon stoppe la propagation plus bas
    // pour valider sans ouvrir la carte.
    card.querySelector('.case-front').addEventListener('click', () => openZoomedCase(card));
    card.querySelector('.case-back .flip-btn').addEventListener('click', (ev) => {
      ev.stopPropagation();
      closeZoomedCase();
    });

    const chip = card.querySelector('.case-chip-copy');
    chip.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      try {
        await copyText(ctId);
        chip.classList.add('copied');
        setTimeout(() => chip.classList.remove('copied'), 900);
        toast(`${ctId} copié dans le presse-papiers`);
      } catch (err) {
        toast(`Copie impossible : ${err.message}`, true);
      }
    });

    const prevBtn = card.querySelector('.btn-prev');
    const nextBtn = card.querySelector('.btn-next');
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === cards.length - 1;
    prevBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (idx > 0) openZoomedCase(cards[idx - 1], 'prev');
    });
    nextBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (idx < cards.length - 1) openZoomedCase(cards[idx + 1], 'next');
    });
    const toggle = (checked) => onToggleCase(plan, ctId, checked, card);
    card.querySelector('.stamp').addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggle(!card.classList.contains('checked'));
    });
    card.querySelector('.btn-validate').addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggle(!card.classList.contains('checked'));
    });
  });
}

function updateCaseCardUI(card, checked) {
  card.classList.toggle('checked', checked);
  const stamp = card.querySelector('.stamp');
  stamp.querySelector('.stamp-icon').textContent = checked ? '✅' : '⬜';
  stamp.title = checked ? 'Marquer à refaire' : 'Marquer comme validé';
  const validateBtn = card.querySelector('.btn-validate');
  validateBtn.classList.toggle('is-done', checked);
  validateBtn.textContent = checked ? '↺ Marquer à refaire' : 'Valider ce cas';
}

function updateChapterUI(plan, chapterEl) {
  if (!chapterEl) return;
  const key = chapterEl.dataset.group;
  const group = getGroupByKey(plan, key);
  const { total, checked } = groupCounts(group.cases);
  const pct = total ? Math.round((checked / total) * 100) : 0;
  const wasComplete = chapterEl.classList.contains('complete');
  const nowComplete = pct === 100 && total > 0;
  chapterEl.classList.toggle('complete', nowComplete);
  chapterEl.querySelector('.chapter-ring').innerHTML = ringSVG(pct, { size: 38, stroke: 4, label: `${checked}/${total}` });
  return { wasComplete, nowComplete, title: group.title };
}

function updateHeroUI(plan) {
  const pct = pctOf(plan.stats);
  const { level } = levelInfo(pct);
  els.detail.querySelector('.hero-ring').innerHTML = ringSVG(pct, { size: 88, stroke: 8, label: `${pct}%` });
  els.detail.querySelector('.xp-level-chip').innerHTML = `Niveau ${level} <span class="xp-level-max">/ 10</span>`;
  els.detail.querySelector('.xp-bar-fill').style.width = `${pct}%`;
  els.detail.querySelector('.xp-rocket').style.left = `${pct}%`;
  els.detail.querySelector('.xp-count').textContent = `${plan.stats.checked}/${plan.stats.total} CT validés`;
}

async function onToggleCase(plan, ctId, checked, cardEl) {
  cardEl.classList.add('pending');
  const wasPlanComplete = plan.stats.total > 0 && plan.stats.checked === plan.stats.total;
  const chapterEl = cardEl.closest('.chapter');
  try {
    const res = await api('/api/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dir: state.dir, file: plan.fileName, ctId, checked }),
    });
    const kase = findCase(plan, ctId);
    kase.checked = checked;
    plan.stats = res.stats;

    updateCaseCardUI(cardEl, checked);
    const chapterResult = updateChapterUI(plan, chapterEl);
    updateHeroUI(plan);
    updateSidebarCard(plan);

    if (checked) {
      const { x, y } = centerOf(cardEl.querySelector('.stamp'));
      spawnConfetti(x, y, { count: 12 });
      if (chapterResult && chapterResult.nowComplete && !chapterResult.wasComplete) {
        const headerPos = centerOf(chapterEl.querySelector('.chapter-header'));
        spawnConfetti(headerPos.x, headerPos.y, { count: 28, big: true });
        toast(`Chapitre « ${chapterResult.title} » terminé !`);
      }
      const nowPlanComplete = plan.stats.total > 0 && plan.stats.checked === plan.stats.total;
      if (nowPlanComplete && !wasPlanComplete) {
        spawnConfetti(window.innerWidth / 2, 70, { count: 70, big: true, spread: 200 });
        toast(`Plan « ${plan.title} » terminé à 100 % !`);
      } else if (!(chapterResult && chapterResult.nowComplete && !chapterResult.wasComplete)) {
        toast(`${ctId} validé — enregistré dans ${plan.fileName}`);
      }
    } else {
      toast(`${ctId} remis à refaire — enregistré dans ${plan.fileName}`);
    }
  } catch (err) {
    toast(`Échec de l'enregistrement : ${err.message}`, true);
  } finally {
    cardEl.classList.remove('pending');
  }
}

// ---------------------------------------------------------------------------
// Persistance de la position : dossier / plan / cas dans l'URL, défilement en
// sessionStorage. Le scroll est volontairement hors de l'URL — l'y écrire la
// réécrirait à chaque image de défilement et rendrait le lien illisible.
// ---------------------------------------------------------------------------
function readUrlState() {
  const p = new URLSearchParams(location.search);
  return { dir: p.get('dir'), plan: p.get('plan'), ct: p.get('ct') };
}

// Lu une seule fois au chargement : les rendus suivants réécrivent l'URL, ce
// qui effacerait ces valeurs avant qu'on ait pu les restaurer.
const boot = readUrlState();

function writeUrlState() {
  const p = new URLSearchParams();
  if (state.dir) p.set('dir', state.dir);
  if (state.activeFile) p.set('plan', state.activeFile);
  if (zoomedCard) p.set('ct', zoomedCard.dataset.ct);
  const qs = p.toString();
  // replaceState : la navigation entre cas ne doit pas empiler des dizaines
  // d'entrées d'historique.
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

function scrollKey() {
  return `tpv-scroll:${state.dir}:${state.activeFile}`;
}

function saveScroll() {
  if (!state.activeFile) return;
  try {
    sessionStorage.setItem(scrollKey(), String(els.detail.scrollTop));
  } catch {
    /* stockage indisponible (navigation privée) : la position est simplement perdue */
  }
}

function restoreScroll() {
  if (!state.activeFile) return;
  try {
    const v = sessionStorage.getItem(scrollKey());
    if (v !== null) els.detail.scrollTop = Number(v) || 0;
  } catch {
    /* idem */
  }
}

function openCaseById(ctId) {
  const card = els.detail.querySelector(`.case-card[data-ct="${CSS.escape(ctId)}"]`);
  if (card) openZoomedCase(card);
  return Boolean(card);
}

function findCase(plan, ctId) {
  for (const g of plan.groups) {
    const c = g.cases.find((c) => c.id === ctId);
    if (c) return c;
  }
  if (plan.nonRegression) {
    const c = plan.nonRegression.cases.find((c) => c.id === ctId);
    if (c) return c;
  }
  return null;
}

function selectPlan(fileName) {
  state.activeFile = fileName;
  state.collapsedGroups.clear();
  renderSidebar();
  const plan = state.plans.find((p) => p.fileName === fileName);
  if (plan) renderDetail(plan);
  // sélection explicite : on repart du haut du plan
  els.detail.scrollTop = 0;
  saveScroll();
  writeUrlState();
}

// ---------------------------------------------------------------------------
// Choix du dossier de plans de test
// ---------------------------------------------------------------------------
function renderFolderOptions() {
  const opts = state.discovered.map((d) => `<option value="${escapeHtml(d.abs)}">${escapeHtml(d.rel)}</option>`);
  if (state.dir && !state.discovered.some((d) => d.abs === state.dir)) {
    opts.unshift(`<option value="${escapeHtml(state.dir)}">${escapeHtml(state.dir)}</option>`);
  }
  els.folderSelect.innerHTML = opts.join('');
  if (state.dir) els.folderSelect.value = state.dir;
}

async function loadDiscover() {
  const { dirs } = await api('/api/discover');
  state.discovered = dirs;
  renderFolderOptions();
}

async function loadDir(dir, opts = {}) {
  els.sidebarEmpty.textContent = 'Chargement…';
  els.sidebar.innerHTML = '';
  els.sidebar.appendChild(els.sidebarEmpty);
  let res;
  try {
    res = await api(`/api/scan?dir=${encodeURIComponent(dir)}`);
  } catch (err) {
    els.sidebarEmpty.textContent = 'Dossier illisible.';
    els.detail.innerHTML = `<div class="detail-empty">Impossible de lire ce dossier :<br><code>${escapeHtml(String(dir))}</code><br><br>${escapeHtml(err.message)}</div>`;
    throw err;
  }
  state.dir = res.dir;
  state.plans = res.plans;
  // Le plan demandé (URL) prime, s'il existe encore dans le dossier.
  const wanted = opts.plan && res.plans.some((p) => p.fileName === opts.plan) ? opts.plan : res.plans[0]?.fileName;
  state.activeFile = wanted || null;
  renderFolderOptions();
  renderSidebar();
  if (state.activeFile) {
    const plan = state.plans.find((p) => p.fileName === state.activeFile);
    renderDetail(plan);
    // Après le rendu : ouvrir le cas d'abord (il déplie son chapitre au besoin,
    // ce qui changerait la hauteur), puis rétablir le défilement.
    requestAnimationFrame(() => {
      // Un cas absent (plan modifié depuis) doit disparaître de l'URL.
      if (opts.ct && !openCaseById(opts.ct)) writeUrlState();
      if (opts.restoreScroll) restoreScroll();
    });
  } else {
    els.detail.innerHTML = '<div class="detail-empty">Aucun plan de test dans ce dossier. Utilisez « Parcourir… » pour en choisir un autre.</div>';
  }
  writeUrlState();
}

// ---------------------------------------------------------------------------
// Navigateur de dossiers (modale) — parcourt librement le système de fichiers
// ---------------------------------------------------------------------------
function renderBreadcrumb(p) {
  const sep = p.includes('/') ? '/' : '\\';
  const isAbsUnix = p.startsWith('/');
  const parts = p.split(/[\\/]/).filter(Boolean);
  const crumbs = isAbsUnix ? [{ label: '/', path: '/' }] : [];
  let acc = isAbsUnix ? '' : '';
  for (const part of parts) {
    acc = acc ? acc + sep + part : part;
    crumbs.push({ label: part, path: isAbsUnix ? sep + acc.replace(/^\/+/, '') : acc });
  }
  els.browseBreadcrumb.innerHTML = crumbs
    .map((c, i) => `<button type="button" class="crumb" data-path="${escapeHtml(c.path)}">${escapeHtml(c.label)}</button>${i < crumbs.length - 1 ? '<span class="crumb-sep">›</span>' : ''}`)
    .join('');
  els.browseBreadcrumb.querySelectorAll('.crumb').forEach((btn) => {
    btn.addEventListener('click', () => loadBrowsePath(btn.dataset.path));
  });
}

function setBrowseSelectable(enabled) {
  els.browseSelect.disabled = !enabled;
}

async function loadBrowsePath(p) {
  els.browseList.innerHTML = '<div class="browse-loading">Chargement…</div>';
  setBrowseSelectable(false);
  try {
    const data = await api(`/api/browse?path=${encodeURIComponent(p || '')}`);
    browseState.path = data.path;
    browseState.parent = data.parent;
    setBrowseSelectable(true);
    renderBreadcrumb(data.path);
    els.browseCurrent.textContent = data.path;
    const rows = [];
    if (data.parent) {
      rows.push(`<button type="button" class="browse-row browse-row-up" data-path="${escapeHtml(data.parent)}"><span>← Dossier parent</span></button>`);
    }
    for (const d of data.dirs) {
      rows.push(
        `<button type="button" class="browse-row ${d.hasPlans ? 'has-plans' : ''}" data-path="${escapeHtml(d.path)}"><span>${escapeHtml(d.name)}</span>${d.hasPlans ? '<span class="browse-tag">plans détectés</span>' : ''}</button>`
      );
    }
    els.browseList.innerHTML = rows.join('') || '<div class="browse-empty">Aucun sous-dossier.</div>';
    els.browseList.querySelectorAll('.browse-row').forEach((row) => {
      row.addEventListener('click', () => loadBrowsePath(row.dataset.path));
    });
  } catch (err) {
    browseState.path = null;
    els.browseList.innerHTML = `<div class="browse-empty">Erreur : ${escapeHtml(err.message)}</div>`;
  }
}

function openBrowseModal() {
  closeZoomedCase();
  els.browseModal.hidden = false;
  loadBrowsePath(state.dir || undefined);
}

function closeBrowseModal() {
  els.browseModal.hidden = true;
}

// ---------------------------------------------------------------------------
// Thème & câblage général
// ---------------------------------------------------------------------------
function applyStoredTheme() {
  const stored = localStorage.getItem('tpv-theme');
  if (stored) document.documentElement.setAttribute('data-theme', stored);
}

els.themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : current === 'light' ? null : 'dark';
  if (next) {
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tpv-theme', next);
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('tpv-theme');
  }
});

els.folderSelect.addEventListener('change', () => loadDir(els.folderSelect.value));
els.folderBrowse.addEventListener('click', openBrowseModal);
els.browseClose.addEventListener('click', closeBrowseModal);
els.browseModal.addEventListener('click', (ev) => {
  if (ev.target === els.browseModal) closeBrowseModal();
});
els.caseBackdrop.addEventListener('click', closeZoomedCase);
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  if (!els.browseModal.hidden) closeBrowseModal();
  else if (zoomedCard) closeZoomedCase();
});
els.browseSelect.addEventListener('click', async () => {
  const chosen = browseState.path;
  if (!chosen) return;
  closeBrowseModal();
  try {
    await loadDir(chosen);
    toast(`Dossier sélectionné : ${chosen}`);
  } catch (err) {
    toast(`Échec du chargement du dossier : ${err.message}`, true);
  }
});
els.search.addEventListener('input', renderSidebar);

// Défilement mémorisé au fil de l'eau, throttlé sur l'image d'affichage.
let scrollRaf = null;
els.detail.addEventListener('scroll', () => {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = null;
    saveScroll();
  });
});

async function init() {
  applyStoredTheme();
  const config = await api('/api/config');
  state.dir = boot.dir || config.defaultDir;
  await loadDiscover();
  await loadDir(state.dir, { plan: boot.plan, ct: boot.ct, restoreScroll: true });
}

init().catch((err) => {
  els.sidebarEmpty.textContent = `Erreur : ${err.message}`;
  els.detail.innerHTML = `<div class="detail-empty">Erreur de chargement : ${escapeHtml(err.message)}</div>`;
});
