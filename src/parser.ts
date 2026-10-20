// Parseur dédié au format "plan-de-test" (voir gabarit docs/_templates/test-plan.md
// dans les projets qui l'utilisent). Volontairement spécifique à ce gabarit plutôt
// qu'un parseur Markdown générique : le format est stable et documenté.
//
// Port fidèle de l'ancien lib/parser.mjs : mêmes regex, même découpage en
// sections, même comportement de toggleCase (patch textuel chirurgical, jamais
// une régénération depuis la structure parsée — préserve tout le reste du
// fichier source intact).

import type { Callout, CalloutItem, ChapterGroup, DocTable, Plan, PlanMeta, TestCase } from './api-types.js';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;
const HEADING1_RE = /^#\s+(.*)$/m;
const META_LINE_RE = /^\*\*(Objet|Fonctionnalités couvertes|Hors périmètre)\s*:\*\*\s*(.*)$/;
const SECTION_RE = /^##\s+(.*)$/;
const GROUP_RE = /^###\s+(.*)$/;
const CASE_HEADER_RE = /^- \[([ xX])\]\s+\*\*(CT-\d+)\s*[—-]\s*(.+?)\*\*\s*$/;
const TABLE_ROW_RE = /^\|(.+)\|\s*$/;
const TABLE_SEP_RE = /^\|?[\s:|-]+\|?$/;
const CALLOUT_RE = /^>\s*\[!(\w+)\]\s*(.*)$/;
const KV_LINE_RE = /^([\w-]+):\s*(.*)$/;
const LIST_ITEM_RE = /^\s*-\s+/;
const PRECONDITION_PREFIX_RE = /^\*\*Pr[ée]-condition\*\*\s*[:—-]\s*/i;

// Un groupe de capture non optionnel dans le pattern (pas de `?`) est toujours
// présent si `.match()` a réussi — mais `noUncheckedIndexedAccess` type quand
// même `m[i]` en `string | undefined`. Ce helper documente cette garantie sans
// jamais recourir à `as`.
function requiredGroup(m: RegExpMatchArray, index: number): string {
  const value = m[index];
  if (value === undefined) {
    throw new Error(`Groupe de capture ${index} absent — pattern regex incohérent avec le code.`);
  }
  return value;
}

type FrontmatterValue = string | string[];
type FrontmatterMeta = Record<string, FrontmatterValue>;

interface ParsedFrontmatter {
  meta: FrontmatterMeta;
  body: string;
}

interface TopSection {
  name: string;
  lines: string[];
}

// Formes internes de parseTable/parseCallout : `nextIdx` est un curseur de
// parsing, jamais exposé dans le JSON final (contrairement à l'ancien
// lib/parser.mjs, qui laissait fuiter ce champ jusque dans la réponse HTTP).
interface ParsedTable {
  table: DocTable;
  nextIdx: number;
}

interface ParsedCallout {
  callout: Callout;
  nextIdx: number;
}

interface ParsedCase {
  case: TestCase;
  nextIdx: number;
}

function parseFrontmatter(text: string): ParsedFrontmatter {
  const m = text.match(FRONTMATTER_RE);
  if (!m) return { meta: {}, body: text };

  const meta: FrontmatterMeta = {};
  const lines = requiredGroup(m, 1).split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const kv = line.match(KV_LINE_RE);
    if (!kv) continue;
    const key = requiredGroup(kv, 1);
    const rawValue = requiredGroup(kv, 2).trim();

    if (rawValue === '') {
      const items: string[] = [];
      let next = lines[i + 1];
      while (next !== undefined && LIST_ITEM_RE.test(next)) {
        i++;
        items.push(next.replace(LIST_ITEM_RE, '').trim());
        next = lines[i + 1];
      }
      meta[key] = items;
    } else if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      meta[key] = rawValue
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else {
      meta[key] = rawValue.replace(/^"(.*)"$/, '$1');
    }
  }
  return { meta, body: text.slice(m[0].length) };
}

// `type`/`ticket`/`domain`/`status`/`date` sont censés être des scalaires dans
// le gabarit ; si un auteur en fait malgré tout une liste (cas non rencontré
// dans les gabarits réels), on retombe sur '' plutôt que de faire fuiter un
// tableau dans un champ typé `string` — déviation mineure assumée par rapport
// à l'ancien code JS, qui aurait silencieusement assigné le tableau tel quel.
function toMetaString(value: FrontmatterValue | undefined): string {
  if (value === undefined) return '';
  return Array.isArray(value) ? '' : value;
}

function toTags(value: FrontmatterValue | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function splitTopSections(body: string): TopSection[] {
  const lines = body.split('\n');
  const sections: TopSection[] = [];
  let current: TopSection = { name: '__preamble__', lines: [] };
  for (const line of lines) {
    const m = line.match(SECTION_RE);
    if (m) {
      sections.push(current);
      current = { name: requiredGroup(m, 1).trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  return sections;
}

function splitCells(rawLine: string): string[] {
  return rawLine
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());
}

function parseTable(lines: string[], startIdx: number): ParsedTable | null {
  let i = startIdx;
  const headerLine = lines[i];
  if (headerLine === undefined || !TABLE_ROW_RE.test(headerLine)) return null;
  const header = splitCells(headerLine);
  i++;

  const sepLine = lines[i];
  if (sepLine !== undefined && TABLE_SEP_RE.test(sepLine.trim())) i++;

  const rows: string[][] = [];
  let rowLine = lines[i];
  while (rowLine !== undefined && TABLE_ROW_RE.test(rowLine)) {
    rows.push(splitCells(rowLine));
    i++;
    rowLine = lines[i];
  }
  return { table: { header, rows }, nextIdx: i };
}

function parseCallout(lines: string[], startIdx: number): ParsedCallout | null {
  let i = startIdx;
  const firstLine = lines[i];
  if (firstLine === undefined) return null;
  const first = firstLine.match(CALLOUT_RE);
  if (!first) return null;
  const type = requiredGroup(first, 1);
  const title = requiredGroup(first, 2).trim();
  i++;

  const items: CalloutItem[] = [];
  let line = lines[i];
  while (line !== undefined && /^>/.test(line)) {
    const raw = line.replace(/^>\s?/, '');
    const trimmed = raw.trim();
    if (trimmed !== '') {
      const bullet = /^-\s+/.test(trimmed);
      items.push({ text: trimmed.replace(/^-\s+/, ''), bullet });
    }
    i++;
    line = lines[i];
  }
  return { callout: { type, title, items }, nextIdx: i };
}

function parseCaseAt(lines: string[], startIdx: number): ParsedCase | null {
  const headerLine = lines[startIdx];
  if (headerLine === undefined) return null;
  const header = headerLine.match(CASE_HEADER_RE);
  if (!header) return null;

  let i = startIdx + 1;
  let precondition: string | null = null;
  let steps: DocTable | null = null;

  let line = lines[i];
  while (line !== undefined && line.trim() === '') {
    i++;
    line = lines[i];
  }

  if (line !== undefined && !CALLOUT_RE.test(line) && /^>/.test(line)) {
    const preLines: string[] = [];
    let preLine = lines[i];
    while (preLine !== undefined && /^>/.test(preLine)) {
      preLines.push(preLine.replace(/^>\s?/, ''));
      i++;
      preLine = lines[i];
    }
    precondition = preLines.join(' ').trim().replace(PRECONDITION_PREFIX_RE, '');
  }

  let blank = lines[i];
  while (blank !== undefined && blank.trim() === '') {
    i++;
    blank = lines[i];
  }

  const table = parseTable(lines, i);
  if (table) {
    steps = table.table;
    i = table.nextIdx;
  }

  return {
    case: {
      id: requiredGroup(header, 2),
      checked: requiredGroup(header, 1).toLowerCase() === 'x',
      title: requiredGroup(header, 3).trim(),
      precondition,
      steps,
    },
    nextIdx: i,
  };
}

function parseCasesFromLines(lines: string[]): TestCase[] {
  const cases: TestCase[] = [];
  let i = 0;
  while (i < lines.length) {
    const parsed = parseCaseAt(lines, i);
    if (!parsed) {
      i++;
      continue;
    }
    cases.push(parsed.case);
    i = parsed.nextIdx;
  }
  return cases;
}

function parseCasDeTest(lines: string[]): ChapterGroup[] {
  const groups: ChapterGroup[] = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentTitle !== null) {
      groups.push({ title: currentTitle, cases: parseCasesFromLines(currentLines) });
    }
  };

  for (const line of lines) {
    const m = line.match(GROUP_RE);
    if (m) {
      flush();
      currentTitle = requiredGroup(m, 1).trim();
      currentLines = [];
    } else if (currentTitle !== null) {
      currentLines.push(line);
    }
  }
  flush();
  return groups;
}

function parsePreRequis(lines: string[]): { table: DocTable | null; tip: Callout | null } {
  let i = 0;
  let line = lines[i];
  while (line !== undefined && !TABLE_ROW_RE.test(line)) {
    i++;
    line = lines[i];
  }
  const table = parseTable(lines, i);
  let tip: Callout | null = null;
  if (table) i = table.nextIdx;

  let calloutLine = lines[i];
  while (calloutLine !== undefined) {
    if (CALLOUT_RE.test(calloutLine)) {
      const parsed = parseCallout(lines, i);
      tip = parsed ? parsed.callout : null;
      break;
    }
    i++;
    calloutLine = lines[i];
  }
  return { table: table ? table.table : null, tip };
}

function parseCalloutSection(lines: string[]): Callout | null {
  let i = 0;
  let line = lines[i];
  while (line !== undefined && !CALLOUT_RE.test(line)) {
    i++;
    line = lines[i];
  }
  if (line === undefined) return null;
  const parsed = parseCallout(lines, i);
  return parsed ? parsed.callout : null;
}

function findFirstTable(lines: string[]): DocTable | null {
  let i = 0;
  let line = lines[i];
  while (line !== undefined && !TABLE_ROW_RE.test(line)) {
    i++;
    line = lines[i];
  }
  const parsed = parseTable(lines, i);
  return parsed ? parsed.table : null;
}

export function parsePlanDeTest(rawText: string, fileName: string): Plan {
  const { meta: frontmatter, body } = parseFrontmatter(rawText);
  const titleMatch = body.match(HEADING1_RE);
  const title = titleMatch ? requiredGroup(titleMatch, 1).trim() : fileName;

  const info = { objet: '', fonctionnalites: '', horsPerimetre: '' };
  for (const line of body.split('\n')) {
    const m = line.match(META_LINE_RE);
    if (!m) continue;
    const label = requiredGroup(m, 1);
    const value = requiredGroup(m, 2).trim();
    if (label === 'Objet') info.objet = value;
    else if (label === 'Fonctionnalités couvertes') info.fonctionnalites = value;
    else if (label === 'Hors périmètre') info.horsPerimetre = value;
  }

  const sections = splitTopSections(body);
  const byName: Record<string, string[]> = {};
  for (const s of sections) byName[s.name] = s.lines;

  const preRequisLines = byName['Pré-requis'];
  const preRequis = preRequisLines ? parsePreRequis(preRequisLines) : null;

  const couverture = findFirstTable(byName['Couverture'] ?? []);

  const groups = byName['Cas de test'] ? parseCasDeTest(byName['Cas de test']) : [];
  const nonRegCases = byName['Non-régression'] ? parseCasesFromLines(byName['Non-régression']) : [];

  const limites = byName['Limites du test'] ? parseCalloutSection(byName['Limites du test']) : null;

  const anomalies = findFirstTable(byName['Anomalies constatées'] ?? []);

  const allCases = [...groups.flatMap((g) => g.cases), ...nonRegCases];
  const total = allCases.length;
  const checked = allCases.filter((c) => c.checked).length;

  const planMeta: PlanMeta = {
    type: toMetaString(frontmatter.type),
    ticket: toMetaString(frontmatter.ticket),
    domain: toMetaString(frontmatter.domain),
    status: toMetaString(frontmatter.status),
    date: toMetaString(frontmatter.date),
    tags: toTags(frontmatter.tags),
  };

  return {
    fileName,
    meta: planMeta,
    title,
    info,
    preRequis,
    couverture,
    groups,
    nonRegression: nonRegCases.length > 0 ? { title: 'Non-régression', cases: nonRegCases } : null,
    limites,
    anomalies,
    stats: { total, checked },
  };
}

// Patch textuel chirurgical : modifie UNIQUEMENT le caractère [ ]/[x] de la
// ligne du cas concerné, préserve tout le reste du fichier source intact.
// Jamais une régénération depuis la structure parsée.
export function toggleCase(rawText: string, ctId: string, checked: boolean): string | null {
  const marker = checked ? 'x' : ' ';
  const lineRe = new RegExp(`^(- \\[)([ xX])(\\]\\s+\\*\\*${ctId}\\b)`, 'm');
  if (!lineRe.test(rawText)) return null;
  return rawText.replace(lineRe, `$1${marker}$3`);
}

// Même philosophie que toggleCase : patch textuel chirurgical du frontmatter.
// Seule la ligne `status:` est réécrite (ou insérée si absente), le reste du
// fichier — commentaires, ordre des clés, corps du document — reste intact.
// Retourne null si le fichier n'a pas de frontmatter à patcher.
const STATUS_LINE_RE = /^status:[^\n]*$/m;
const FRONTMATTER_DELIMITER_RE = /^---\s*$/;

function insertStatusLine(block: string, status: string): string {
  const lines = block.split('\n');
  // Le délimiteur ouvrant est la ligne 0 ; le premier suivant ferme le bloc.
  const closingIdx = lines.findIndex((line, idx) => idx > 0 && FRONTMATTER_DELIMITER_RE.test(line));
  if (closingIdx === -1) return block;
  lines.splice(closingIdx, 0, `status: ${status}`);
  return lines.join('\n');
}

export function setPlanStatus(rawText: string, status: string): string | null {
  const m = rawText.match(FRONTMATTER_RE);
  if (!m) return null;
  const block = m[0];
  const patched = STATUS_LINE_RE.test(block)
    ? block.replace(STATUS_LINE_RE, `status: ${status}`)
    : insertStatusLine(block, status);
  return patched + rawText.slice(block.length);
}
