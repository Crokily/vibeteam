import type { TaskStatus } from '../../../../shared/ipc-types';

const statusStyles: Record<TaskStatus, string> = {
  PENDING: 'border-dashed border-border/40 text-ash/40 bg-transparent',
  RUNNING: 'border-emerald-500/50 text-emerald-100 bg-emerald-500/10 animate-pulse shadow-[0_0_10px_-3px_rgba(16,185,129,0.2)]',
  WAITING_FOR_USER: 'border-amber-400/50 text-amber-100 bg-amber-400/10',
  DONE: 'border-border bg-ink/40 text-ash',
  ERROR: 'border-rose-500/50 text-rose-200 bg-rose-500/10',
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
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-ash mb-4">
          <span>Workflow</span>
          <span className="text-iron">{taskCount}</span>
        </div>
        
        <div className="mt-4 rounded-xl overflow-hidden border border-border/20">
          {taskCount === 0 ? (
            <div className="bg-ink/50 px-3 py-4 text-ash text-center italic text-xs">
              No tasks active
            </div>
          ) : (
            stages.map((stage, idx) => (
              <div 
                key={stage.id} 
                className={`grid grid-cols-2 gap-2 p-3 ${
                  idx % 2 === 0 ? 'bg-sky-500/10' : 'bg-white/10'
                }`}
              >
                {stage.taskIds.map((taskId) => {
                  const isActive = taskId === activeTaskId;
                  const status = taskStatuses[taskId] ?? 'PENDING';
                  const label = taskMeta[taskId]?.label ?? taskId;
                  
                  return (
                    <button
                      key={taskId}
                      onClick={() => onSelectTask(taskId)}
                      className={`relative flex items-center justify-start rounded-lg border px-3 py-2 text-left transition-all duration-200 overflow-hidden ${statusStyles[status]} hover:border-iron/40 hover:text-iron`}
                    >
                      <span 
                        className={`truncate font-medium w-full text-[11px] ${isActive ? 'underline decoration-2 underline-offset-4 decoration-accent' : ''}`} 
                        title={label}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
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
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
            <span className={pendingCount > 0 ? 'text-amber-400 font-bold' : 'text-iron'}>
              {pendingCount}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};


