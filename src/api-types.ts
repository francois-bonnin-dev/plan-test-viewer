// Contrat JSON partagé entre le serveur et le client SPA. Le serveur en est
// l'autorité (ces types reflètent exactement ce que src/parser.ts et src/app.ts
// produisent) ; le client l'importe par chemin relatif, sans copie ni cast —
// voir client/src/api/guards.ts pour la validation runtime côté client.

export interface PlanMeta {
  type: string;
  ticket: string;
  domain: string;
  status: string;
  date: string;
  tags: string[];
}

export interface PlanInfo {
  objet: string;
  fonctionnalites: string;
  horsPerimetre: string;
}

export interface DocTable {
  header: string[];
  rows: string[][];
}

export interface CalloutItem {
  text: string;
  bullet: boolean;
}

export interface Callout {
  type: string;
  title: string;
  items: CalloutItem[];
}

export interface TestCase {
  id: string;
  checked: boolean;
  title: string;
  precondition: string | null;
  steps: DocTable | null;
}

export interface ChapterGroup {
  title: string;
  cases: TestCase[];
}

export interface NonRegressionSection {
  title: 'Non-régression';
  cases: TestCase[];
}

export interface PreRequisSection {
  table: DocTable | null;
  tip: Callout | null;
}

export interface PlanStats {
  total: number;
  checked: number;
}

export interface Plan {
  fileName: string;
  meta: PlanMeta;
  title: string;
  info: PlanInfo;
  preRequis: PreRequisSection | null;
  couverture: DocTable | null;
  groups: ChapterGroup[];
  nonRegression: NonRegressionSection | null;
  limites: Callout | null;
  anomalies: DocTable | null;
  stats: PlanStats;
}

export interface ConfigResponse {
  defaultDir: string;
  repoRoot: string;
}

export interface DiscoveredDir {
  rel: string;
  abs: string;
}

export interface DiscoverResponse {
  dirs: DiscoveredDir[];
}

export interface BrowseDirEntry {
  name: string;
  path: string;
  hasPlans: boolean;
}

export interface BrowseResponse {
  path: string;
  parent: string | null;
  hasPlans: boolean;
  dirs: BrowseDirEntry[];
}

export interface ScanResponse {
  dir: string;
  plans: Plan[];
}

export interface ToggleRequestBody {
  dir: string;
  file: string;
  ctId: string;
  checked: boolean;
}

export interface ToggleSuccessResponse {
  ok: true;
  stats: PlanStats;
}

export interface ApiErrorResponse {
  error: string;
}
