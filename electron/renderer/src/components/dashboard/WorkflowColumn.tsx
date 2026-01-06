import { useEffect, useMemo, useRef, useState } from 'react';
import type { OrchestratorState, TaskStatus } from '../../../../shared/ipc-types';
import type { SessionLayout, SessionState } from '../../stores/app-store';
import { TerminalTabs } from '../terminal/TerminalTabs';
import { XTermTerminal } from '../terminal/XTermTerminal';

const taskStatusStyles: Record<TaskStatus, string> = {
  PENDING: 'border-dashed border-border/40 text-ash/60 bg-transparent',
  RUNNING:
    'border-emerald-400/40 text-emerald-100 bg-emerald-400/10 animate-pulse',
  WAITING_FOR_USER: 'border-amber-400/50 text-amber-100 bg-amber-400/10',
  DONE: 'border-border bg-ink/40 text-ash',
  ERROR: 'border-rose-500/50 text-rose-200 bg-rose-500/10',
};

const orchestratorStyles: Record<OrchestratorState, string> = {
  IDLE: 'border-border text-ash bg-ink/60',
  RUNNING: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10',
  AWAITING_INTERACTION: 'border-amber-400/40 text-amber-200 bg-amber-400/10',
  PAUSED: 'border-sky-400/40 text-sky-200 bg-sky-400/10',
  ERROR: 'border-rose-400/40 text-rose-200 bg-rose-400/10',
};

type WorkflowColumnProps = {
  session: SessionState;
  scrollRoot: HTMLElement | null;
  isHighlighted: boolean;
  onLayoutChange: (sessionId: string, layout: SessionLayout) => void;
  onSelectTask: (sessionId: string, taskId: string) => void;
  onClose: (sessionId: string) => void;
  onInteractionSubmitted: (sessionId: string, taskId: string) => void;
  registerRef: (sessionId: string, node: HTMLDivElement | null) => void;
};

const layoutWidths: Record<SessionLayout, string> = {
  minimized: 'w-[72px]',
  standard: 'w-[360px]',
  expanded: 'w-[880px]',
};

export const WorkflowColumn = ({
  session,
  scrollRoot,
  isHighlighted,
  onLayoutChange,
  onSelectTask,
  onClose,
  onInteractionSubmitted,
  registerRef,
}: WorkflowColumnProps) => {
  const columnRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    registerRef(session.sessionId, columnRef.current);
    return () => registerRef(session.sessionId, null);
  }, [registerRef, session.sessionId]);

  useEffect(() => {
    const node = columnRef.current;
    if (!node || !scrollRoot) {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { root: scrollRoot, threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [scrollRoot]);

  const goalLabel =
    session.workflow?.goal?.trim() ||
    session.workflow?.id ||
    'Untitled workflow';

  const taskIds = useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();

    if (session.workflowStages.length > 0) {
      session.workflowStages.forEach((stage) => {
        stage.taskIds.forEach((taskId) => {
          if (seen.has(taskId)) {
            return;
          }
          seen.add(taskId);
          ordered.push(taskId);
        });
      });
    }

    Object.keys(session.taskStatuses).forEach((taskId) => {
      if (seen.has(taskId)) {
        return;
      }
      seen.add(taskId);
      ordered.push(taskId);
    });

    session.pendingInteractions.forEach((interaction) => {
      if (seen.has(interaction.taskId)) {
        return;
      }
      seen.add(interaction.taskId);
      ordered.push(interaction.taskId);
    });

    return ordered;
  }, [session.pendingInteractions, session.taskStatuses, session.workflowStages]);

  const attentionTaskIds = useMemo(
    () => new Set(session.pendingInteractions.map((interaction) => interaction.taskId)),
    [session.pendingInteractions]
  );

  const resolvedActiveTaskId = session.activeTaskId ?? taskIds[0] ?? null;
  const layout = session.layout;

  if (layout === 'minimized') {
    return (
      <div
        ref={columnRef}
        className={`flex flex-none flex-col items-center justify-between rounded-3xl border border-border bg-ink/50 px-2 py-3 ${layoutWidths[layout]} ${
          isHighlighted ? 'ring-2 ring-amber-400/40' : ''
        }`}
        onClick={() => onLayoutChange(session.sessionId, 'standard')}
      >
        <span
          className={`h-2 w-2 rounded-full ${orchestratorStyles[session.orchestratorState]} border`}
          aria-hidden
        />
        <div
          className="py-6 text-[11px] uppercase tracking-[0.25em] text-ash"
          style={{ writingMode: 'vertical-rl' }}
          title={goalLabel}
        >
          {goalLabel}
        </div>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onClose(session.sessionId);
          }}
          className="rounded-full border border-border/60 bg-ink/70 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-ash transition hover:border-rose-300/60 hover:text-rose-200"
        >
          Close
        </button>
      </div>
    );
  }

  const taskPanelClasses =
    layout === 'expanded'
      ? 'flex-none w-[320px] border-r border-border/40'
      : 'flex-1';

  const shouldRenderTerminal = layout === 'expanded' && isVisible;

  return (
    <div
      ref={columnRef}
      className={`flex flex-none flex-col overflow-hidden rounded-3xl border border-border bg-slate/60 ${layoutWidths[layout]} ${
        isHighlighted ? 'ring-2 ring-amber-400/40' : ''
      }`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-ink/50 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm text-iron" title={goalLabel}>
            {goalLabel}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-ash">
            <span
              className={`rounded-full border px-2 py-1 ${orchestratorStyles[session.orchestratorState]}`}
            >
              {session.orchestratorState.replaceAll('_', ' ')}
            </span>
            <span className="max-w-[140px] truncate">{session.sessionId}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ash">
          {layout === 'expanded' ? (
            <button
              onClick={() => onLayoutChange(session.sessionId, 'standard')}
              className="rounded-full border border-border/70 bg-ink/60 px-3 py-1 transition hover:border-iron hover:text-iron"
            >
              Fold
            </button>
          ) : (
            <button
              onClick={() => onLayoutChange(session.sessionId, 'expanded')}
              className="rounded-full border border-border/70 bg-ink/60 px-3 py-1 transition hover:border-iron hover:text-iron"
            >
              Terminal
            </button>
          )}
          <button
            onClick={() => onLayoutChange(session.sessionId, 'minimized')}
            className="rounded-full border border-border/70 bg-ink/60 px-3 py-1 transition hover:border-iron hover:text-iron"
          >
            Min
          </button>
          <button
            onClick={() => onClose(session.sessionId)}
            className="rounded-full border border-border/70 bg-ink/60 px-3 py-1 transition hover:border-rose-300/60 hover:text-rose-200"
          >
            Close
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className={`flex min-h-0 flex-col px-3 py-3 ${taskPanelClasses}`}>
          {taskIds.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-border/40 bg-ink/40 px-3 py-4 text-xs text-ash">
              No tasks yet
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {taskIds.map((taskId) => {
                const status = session.taskStatuses[taskId] ?? 'PENDING';
                const label = session.taskMeta[taskId]?.label ?? taskId;
                const isActive = taskId === resolvedActiveTaskId;
                const needsAttention =
                  attentionTaskIds.has(taskId) || status === 'WAITING_FOR_USER';

                return (
                  <button
                    key={taskId}
                    onClick={() => {
                      onSelectTask(session.sessionId, taskId);
                      if (layout !== 'expanded') {
                        onLayoutChange(session.sessionId, 'expanded');
                      }
                    }}
                    className={`relative flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left text-xs transition ${taskStatusStyles[status]} ${
                      isActive ? 'shadow-[0_0_0_1px_rgba(226,232,240,0.2)]' : ''
                    }`}
                  >
                    <span
                      className={`truncate font-medium ${
                        isActive ? 'text-iron' : 'text-ash'
                      }`}
                      title={label}
                    >
                      {label}
                    </span>
                    {needsAttention ? (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400/40 tab-pulse" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {layout === 'expanded' ? (
          <div className="flex min-h-0 flex-1 flex-col border-l border-border/40">
            <TerminalTabs
              tabs={taskIds.map((taskId) => ({
                id: taskId,
                label: session.taskMeta[taskId]?.label ?? taskId,
                isActive: taskId === resolvedActiveTaskId,
                needsAttention:
                  attentionTaskIds.has(taskId) ||
                  session.taskStatuses[taskId] === 'WAITING_FOR_USER',
              }))}
              onSelect={(taskId) => onSelectTask(session.sessionId, taskId)}
            />
            <div className="relative flex-1 min-h-0 bg-ink/60">
              {shouldRenderTerminal
                ? taskIds.map((taskId) => (
                    <XTermTerminal
                      key={taskId}
                      sessionId={session.sessionId}
                      taskId={taskId}
                      active={taskId === resolvedActiveTaskId}
                      canInteract={
                        session.sessionMode === 'live' &&
                        session.taskMeta[taskId]?.executionMode !== 'headless' &&
                        (session.taskStatuses[taskId] === 'RUNNING' ||
                          session.taskStatuses[taskId] === 'WAITING_FOR_USER')
                      }
                      readOnly={session.sessionMode === 'view'}
                      onInteractionSubmitted={onInteractionSubmitted}
                    />
                  ))
                : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
