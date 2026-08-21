// Parseur dédié au format "plan-de-test" (voir gabarit docs/_templates/plan-de-test.md
// dans les projets qui l'utilisent). Volontairement spécifique à ce gabarit plutôt
// qu'un parseur Markdown générique : le format est stable et documenté.

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;
const HEADING1_RE = /^#\s+(.*)$/m;
const META_LINE_RE = /^\*\*(Objet|Fonctionnalités couvertes|Hors périmètre)\s*:\*\*\s*(.*)$/;
const SECTION_RE = /^##\s+(.*)$/;
const GROUP_RE = /^###\s+(.*)$/;
const CASE_HEADER_RE = /^- \[([ xX])\]\s+\*\*(CT-\d+)\s*[—-]\s*(.+?)\*\*\s*$/;
const TABLE_ROW_RE = /^\|(.+)\|\s*$/;
const TABLE_SEP_RE = /^\|?[\s:|-]+\|?$/;
const CALLOUT_RE = /^>\s*\[!(\w+)\]\s*(.*)$/;

function parseFrontmatter(text) {
  const m = text.match(FRONTMATTER_RE);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  const lines = m[1].split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let value = kv[2].trim();
    if (value === '') {
      const items = [];
      while (i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) {
        i++;
        items.push(lines[i].replace(/^\s*-\s+/, '').trim());
      }
      meta[key] = items;
    } else if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      meta[key] = value.replace(/^"(.*)"$/, '$1');
    }
  }
  return { meta, body: text.slice(m[0].length) };
}

function splitTopSections(body) {
  const lines = body.split('\n');
  const sections = [];
  let current = { name: '__preamble__', lines: [] };
  for (const line of lines) {
    const m = line.match(SECTION_RE);
    if (m) {
      sections.push(current);
      current = { name: m[1].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  return sections;
}

function parseTable(lines, startIdx) {
  let i = startIdx;
  if (i >= lines.length || !TABLE_ROW_RE.test(lines[i])) return null;
  const header = lines[i]
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());
  i++;
  if (i < lines.length && TABLE_SEP_RE.test(lines[i].trim())) i++;
  const rows = [];
  while (i < lines.length && TABLE_ROW_RE.test(lines[i])) {
    rows.push(
      lines[i]
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim())
    );
    i++;
  }
  return { header, rows, nextIdx: i };
}

function parseCallout(lines, startIdx) {
  let i = startIdx;
  const first = lines[i].match(CALLOUT_RE);
  if (!first) return null;
  const type = first[1];
  const title = first[2].trim();
  i++;
  const items = [];
  while (i < lines.length && /^>/.test(lines[i])) {
    const raw = lines[i].replace(/^>\s?/, '');
    if (raw.trim() !== '') {
      const bullet = /^-\s+/.test(raw.trim());
      items.push({ text: raw.trim().replace(/^-\s+/, ''), bullet });
    }
    i++;
  }
  return { type, title, items, nextIdx: i };
}

function parseCasesFromLines(lines) {
  const cases = [];
  let i = 0;
  while (i < lines.length) {
    const header = lines[i].match(CASE_HEADER_RE);
    if (!header) {
      i++;
      continue;
    }
    const kase = {
      id: header[2],
      checked: header[1].toLowerCase() === 'x',
      title: header[3].trim(),
      precondition: null,
      steps: null,
    };
    i++;
    while (i < lines.length && lines[i].trim() === '') i++;
    if (i < lines.length && CALLOUT_RE.test(lines[i]) === false && /^>/.test(lines[i])) {
      const preLines = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        preLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      kase.precondition = preLines
        .join(' ')
        .trim()
        .replace(/^\*\*Pr[ée]-condition\*\*\s*[—-]\s*/i, '');
    }
    while (i < lines.length && lines[i].trim() === '') i++;
    const table = parseTable(lines, i);
    if (table) {
      kase.steps = table;
      i = table.nextIdx;
    }
    cases.push(kase);
  }
  return cases;
}

function parseCasDeTest(lines) {
  const groups = [];
  let current = null;
  const flush = () => {
    if (current) {
      current.cases = parseCasesFromLines(current.lines);
      delete current.lines;
      groups.push(current);
    }
  };
  for (const line of lines) {
    const m = line.match(GROUP_RE);
    if (m) {
      flush();
      current = { title: m[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();
  return groups;
}

function parsePreRequis(lines) {
  let i = 0;
  while (i < lines.length && !TABLE_ROW_RE.test(lines[i])) i++;
  const table = parseTable(lines, i);
  let tip = null;
  if (table) i = table.nextIdx;
  while (i < lines.length) {
    if (CALLOUT_RE.test(lines[i])) {
      tip = parseCallout(lines, i);
      break;
    }
    i++;
  }
  return { table, tip };
}

function parseCalloutSection(lines) {
  let i = 0;
  while (i < lines.length && !CALLOUT_RE.test(lines[i])) i++;
  if (i >= lines.length) return null;
  return parseCallout(lines, i);
}

export function parsePlanDeTest(rawText, fileName) {
  const { meta, body } = parseFrontmatter(rawText);
  const titleMatch = body.match(HEADING1_RE);
  const title = titleMatch ? titleMatch[1].trim() : fileName;

  const info = { objet: '', fonctionnalites: '', horsPerimetre: '' };
  for (const line of body.split('\n')) {
    const m = line.match(META_LINE_RE);
    if (!m) continue;
    if (m[1] === 'Objet') info.objet = m[2].trim();
    else if (m[1] === 'Fonctionnalités couvertes') info.fonctionnalites = m[2].trim();
    else if (m[1] === 'Hors périmètre') info.horsPerimetre = m[2].trim();
  }

  const sections = splitTopSections(body);
  const byName = {};
  for (const s of sections) byName[s.name] = s.lines;

  const preRequis = byName['Pré-requis'] ? parsePreRequis(byName['Pré-requis']) : null;
  const couvertureLines = byName['Couverture'] || [];
  let ci = 0;
  while (ci < couvertureLines.length && !TABLE_ROW_RE.test(couvertureLines[ci])) ci++;
  const couverture = parseTable(couvertureLines, ci);

  const groups = byName['Cas de test'] ? parseCasDeTest(byName['Cas de test']) : [];
  const nonRegCases = byName['Non-régression'] ? parseCasesFromLines(byName['Non-régression']) : [];

  const limites = byName['Limites du test'] ? parseCalloutSection(byName['Limites du test']) : null;

  const anomaliesLines = byName['Anomalies constatées'] || [];
  let ai = 0;
  while (ai < anomaliesLines.length && !TABLE_ROW_RE.test(anomaliesLines[ai])) ai++;
  const anomalies = parseTable(anomaliesLines, ai);

  const allCases = [...groups.flatMap((g) => g.cases), ...nonRegCases];
  const total = allCases.length;
  const checked = allCases.filter((c) => c.checked).length;

  return {
    fileName,
    meta: {
      type: meta.type || '',
      ticket: meta.ticket || '',
      domain: meta.domain || '',
      status: meta.status || '',
      date: meta.date || '',
      tags: meta.tags || [],
    },
    title,
    info,
    preRequis,
    couverture,
    groups,
    nonRegression: nonRegCases.length ? { title: 'Non-régression', cases: nonRegCases } : null,
    limites,
    anomalies,
    stats: { total, checked },
  };
}

export function toggleCase(rawText, ctId, checked) {
  const marker = checked ? 'x' : ' ';
  const lineRe = new RegExp(`^(- \\[)([ xX])(\\]\\s+\\*\\*${ctId}\\b)`, 'm');
  if (!lineRe.test(rawText)) return null;
  return rawText.replace(lineRe, `$1${marker}$3`);
}
