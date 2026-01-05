import type { OrchestratorState } from '../../../../shared/ipc-types';

const statusStyles: Record<OrchestratorState, string> = {
  IDLE: 'border-border text-ash bg-ink/60',
  RUNNING: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10',
  AWAITING_INTERACTION: 'border-amber-400/40 text-amber-200 bg-amber-400/10',
  PAUSED: 'border-sky-400/40 text-sky-200 bg-sky-400/10',
  ERROR: 'border-rose-400/40 text-rose-200 bg-rose-400/10',
};

type HeaderProps = {
  orchestratorState: OrchestratorState;
  sessionId: string | null;
};

export const Header = ({ orchestratorState, sessionId }: HeaderProps) => {
  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-border bg-slate/70 px-6 py-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-full border border-border bg-ink/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-ash transition hover:border-iron hover:text-iron">
          Sessions
        </button>
        <button className="rounded-full border border-border bg-ink/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-ash transition hover:border-iron hover:text-iron">
          New
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-ash">
        <span>Session</span>
        <span className="max-w-[200px] truncate text-xs normal-case tracking-normal text-iron">
          {sessionId ?? 'No session'}
        </span>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-semibold ${statusStyles[orchestratorState] ?? statusStyles.IDLE}`}
        >
          {orchestratorState.replaceAll('_', ' ')}
        </span>
        <button className="rounded-full border border-border bg-ink/60 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-ash transition hover:border-iron hover:text-iron">
          Settings
        </button>
      </div>
    </header>
  );
};
