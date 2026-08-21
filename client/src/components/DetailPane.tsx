import { useMemo } from 'hono/jsx';
import type { RefObject } from 'hono/jsx';
import type { Plan } from '../../../src/api-types.js';
import type { NavDirection } from '../hooks/useZoomedCase.js';
import { anomaliesByCase, buildCaseOrder, findCase, getGroupByKey } from '../lib/plan-selectors.js';
import { Chapter } from './Chapter.js';
import { Hero } from './Hero.js';
import { ZoomedCaseOverlay } from './ZoomedCaseOverlay.js';

export interface ZoomedInfo {
  zoomedCtId: string | null;
  direction: NavDirection;
  isFirst: boolean;
  isLast: boolean;
  close: () => void;
  prev: () => void;
  next: () => void;
}

export interface DetailPaneProps {
  plan: Plan | null;
  collapsed: Set<string>;
  onToggleCollapse: (key: string) => void;
  onOpenCase: (ctId: string) => void;
  zoomed: ZoomedInfo;
  pendingIds: Set<string>;
  onToggleCase: (ctId: string, checked: boolean, originEl: HTMLElement, chapterKey: string) => void;
  onToast: (message: string, isError?: boolean) => void;
  scrollRef: RefObject<HTMLElement | null>;
}

export function DetailPane(props: DetailPaneProps) {
  const { plan } = props;
  const anomalyIndex = useMemo(() => anomaliesByCase(plan?.anomalies ?? null), [plan]);
  const caseOrder = useMemo(() => (plan ? buildCaseOrder(plan) : []), [plan]);

  if (!plan) {
    return (
      <main className="detail" ref={props.scrollRef}>
        <div className="detail-empty">Sélectionnez un plan de test à gauche.</div>
      </main>
    );
  }

  const zoomedCase = props.zoomed.zoomedCtId ? findCase(plan, props.zoomed.zoomedCtId) : null;
  const zoomedRef = props.zoomed.zoomedCtId
    ? caseOrder.find((r) => r.ctId === props.zoomed.zoomedCtId)
    : undefined;
  const zoomedGroup = zoomedRef ? getGroupByKey(plan, zoomedRef.chapterKey) : null;

  return (
    <main className="detail" ref={props.scrollRef}>
      <div className="detail-inner">
        <Hero plan={plan} />
        <section className="plan-board">
          {plan.groups.map((group, idx) => (
            <Chapter
              key={`g${idx}`}
              group={group}
              chapterKey={`g${idx}`}
              isNonReg={false}
              collapsed={props.collapsed.has(`g${idx}`)}
              onToggleCollapse={() => props.onToggleCollapse(`g${idx}`)}
              anomalies={anomalyIndex}
              pendingIds={props.pendingIds}
              onOpenCase={props.onOpenCase}
              onToggleCase={props.onToggleCase}
            />
          ))}
          {plan.nonRegression && (
            <Chapter
              group={plan.nonRegression}
              chapterKey="non-reg"
              isNonReg={true}
              collapsed={props.collapsed.has('non-reg')}
              onToggleCollapse={() => props.onToggleCollapse('non-reg')}
              anomalies={anomalyIndex}
              pendingIds={props.pendingIds}
              onOpenCase={props.onOpenCase}
              onToggleCase={props.onToggleCase}
            />
          )}
        </section>
      </div>

      {zoomedCase && zoomedRef && zoomedGroup && (
        <ZoomedCaseOverlay
          kase={zoomedCase}
          chapterTitle={zoomedGroup.title}
          anomalyHeader={plan.anomalies?.header ?? []}
          anomalyRows={anomalyIndex.get(zoomedCase.id) ?? null}
          pending={props.pendingIds.has(zoomedCase.id)}
          direction={props.zoomed.direction}
          isFirst={props.zoomed.isFirst}
          isLast={props.zoomed.isLast}
          onClose={props.zoomed.close}
          onPrev={props.zoomed.prev}
          onNext={props.zoomed.next}
          onToggle={(checked, stampEl) => props.onToggleCase(zoomedCase.id, checked, stampEl, zoomedRef.chapterKey)}
          onToast={props.onToast}
        />
      )}
    </main>
  );
}
