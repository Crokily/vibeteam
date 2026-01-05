import type { TaskStatus } from '../../../../shared/ipc-types';

const statusBadge: Record<TaskStatus, string> = {
  PENDING: 'border-border text-ash bg-ink/50',
  RUNNING: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10',
  WAITING_FOR_USER: 'border-amber-400/40 text-amber-200 bg-amber-400/10',
  DONE: 'border-slate-400/40 text-slate-200 bg-slate-400/10',
  ERROR: 'border-rose-400/40 text-rose-200 bg-rose-400/10',
};

type WorkflowStageView = {
  id: string;
  index: number;
  taskIds: string[];
};

type TaskMeta = {
  label: string;
};

type SidebarProps = {
  stages: WorkflowStageView[];
  taskMeta: Record<string, TaskMeta>;
  taskStatuses: Record<string, TaskStatus>;
  activeTaskId: string | null;
  pendingCount: number;
  onSelectTask: (taskId: string) => void;
};

export const Sidebar = ({
  stages,
  taskMeta,
  taskStatuses,
  activeTaskId,
  pendingCount,
  onSelectTask,
}: SidebarProps) => {
  const taskCount = stages.reduce(
    (total, stage) => total + stage.taskIds.length,
    0
  );

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-graphite/70 p-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-ash">
          <span>Workflow</span>
          <span className="text-iron">{taskCount}</span>
        </div>
        <div className="mt-4 space-y-3 text-xs">
          {taskCount === 0 ? (
            <div className="rounded-lg border border-border bg-ink/50 px-3 py-2 text-ash">
              No tasks
            </div>
          ) : (
            stages.map((stage) => (
              <div
                key={stage.id}
                className="rounded-xl border border-border/70 bg-ink/50 p-3"
              >
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.32em] text-ash">
                  <span>{`Stage ${stage.index + 1}`}</span>
                  <span className="text-iron">{stage.taskIds.length}</span>
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {stage.taskIds.map((taskId) => {
                    const isActive = taskId === activeTaskId;
                    const status = taskStatuses[taskId] ?? 'PENDING';
                    const label = taskMeta[taskId]?.label ?? taskId;
                    return (
                      <button
                        key={taskId}
                        onClick={() => onSelectTask(taskId)}
                        className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                          isActive
                            ? 'border-accent/40 bg-ink/70 text-iron'
                            : 'border-border/70 bg-ink/40 text-ash hover:border-iron/60 hover:text-iron'
                        }`}
                      >
                        <span className="max-w-[140px] truncate" title={label}>
                          {label}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] ${statusBadge[status]}`}
                        >
                          {status.replaceAll('_', ' ')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-slate/70 p-4">
        <div className="text-xs uppercase tracking-[0.3em] text-ash">
          Signals
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-ash">
          <span>Awaiting input</span>
          <span className="text-iron">{pendingCount}</span>
        </div>
      </section>
    </div>
  );
};
