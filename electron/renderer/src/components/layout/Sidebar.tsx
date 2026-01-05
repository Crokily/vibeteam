import type { TaskStatus } from '../../../../shared/ipc-types';

const statusBadge: Record<TaskStatus, string> = {
  PENDING: 'border-border text-ash bg-ink/50',
  RUNNING: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10',
  WAITING_FOR_USER: 'border-amber-400/40 text-amber-200 bg-amber-400/10',
  DONE: 'border-slate-400/40 text-slate-200 bg-slate-400/10',
  ERROR: 'border-rose-400/40 text-rose-200 bg-rose-400/10',
};

type SidebarProps = {
  taskIds: string[];
  taskStatuses: Record<string, TaskStatus>;
  activeTaskId: string | null;
  pendingCount: number;
};

export const Sidebar = ({
  taskIds,
  taskStatuses,
  activeTaskId,
  pendingCount,
}: SidebarProps) => {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-graphite/70 p-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-ash">
          <span>Workflow</span>
          <span className="text-iron">{taskIds.length}</span>
        </div>
        <div className="mt-4 space-y-2 text-xs">
          {taskIds.length === 0 ? (
            <div className="rounded-lg border border-border bg-ink/50 px-3 py-2 text-ash">
              No tasks
            </div>
          ) : (
            taskIds.map((taskId) => {
              const isActive = taskId === activeTaskId;
              const status = taskStatuses[taskId];
              return (
                <div
                  key={taskId}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    isActive
                      ? 'border-accent/40 bg-ink/70 text-iron'
                      : 'border-border bg-ink/50 text-ash'
                  }`}
                >
                  <span className="truncate" title={taskId}>
                    {taskId}
                  </span>
                  {status ? (
                    <span
                      className={`ml-2 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${statusBadge[status]}`}
                    >
                      {status.replaceAll('_', ' ')}
                    </span>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-slate/70 p-4">
        <div className="text-xs uppercase tracking-[0.3em] text-ash">
          Signals
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-ash">
          <span>Awaiting</span>
          <span className="text-iron">{pendingCount}</span>
        </div>
      </section>
    </div>
  );
};
