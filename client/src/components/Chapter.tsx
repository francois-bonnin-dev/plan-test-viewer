import type { ChapterGroup } from '../../../src/api-types.js';
import { groupCounts } from '../lib/plan-selectors.js';
import { CaseCard } from './CaseCard.js';
import { Ring } from './Ring.js';

export interface ChapterProps {
  group: ChapterGroup;
  chapterKey: string;
  isNonReg: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  anomalies: Map<string, string[][]>;
  pendingIds: Set<string>;
  onOpenCase: (ctId: string) => void;
  onToggleCase: (ctId: string, checked: boolean, originEl: HTMLElement, chapterKey: string) => void;
}

export function Chapter(props: ChapterProps) {
  const { group, chapterKey, isNonReg, collapsed, onToggleCollapse, anomalies, pendingIds, onOpenCase, onToggleCase } =
    props;
  const { total, checked } = groupCounts(group.cases);
  const pct = total ? Math.round((checked / total) * 100) : 0;
  const classes = [
    'chapter',
    isNonReg ? 'chapter-nonreg' : '',
    pct === 100 && total > 0 ? 'complete' : '',
    collapsed ? 'collapsed' : '',
  ]
    .filter((c) => c.length > 0)
    .join(' ');

  return (
    <section className={classes} data-group={chapterKey}>
      <header className="chapter-header" onClick={onToggleCollapse}>
        <span className="chapter-chevron">▾</span>
        <h3 className="chapter-title">{group.title}</h3>
        {isNonReg && <span className="chapter-tag">non-régression</span>}
        <span className="chapter-ring">
          <Ring pct={pct} size={38} stroke={4} label={`${checked}/${total}`} />
        </span>
      </header>
      {/* Repli animé : .chapter-body anime grid-template-rows (1fr ↔ 0fr), ce
          qu'une hauteur `auto` ne permet pas ; .chapter-clip coupe le contenu
          pendant la transition. */}
      <div className="chapter-body">
        <div className="chapter-clip">
          <div className="case-grid">
            {group.cases.map((kase) => {
              const rows = anomalies.get(kase.id);
              return (
                <CaseCard
                  key={kase.id}
                  kase={kase}
                  hasAnomaly={Boolean(rows && rows.length > 0)}
                  pending={pendingIds.has(kase.id)}
                  onOpen={() => onOpenCase(kase.id)}
                  onToggle={(checked, stampEl) => onToggleCase(kase.id, checked, stampEl, chapterKey)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
