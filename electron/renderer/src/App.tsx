import { useEffect } from 'react';
import { useAppStore } from './stores/app-store';
import { connectIpcToStore } from './stores/ipc-sync';

const statusStyles: Record<string, string> = {
  IDLE: 'border-border text-ash bg-slate/60',
  RUNNING: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10',
  AWAITING_INTERACTION: 'border-amber-400/40 text-amber-200 bg-amber-400/10',
  PAUSED: 'border-sky-400/40 text-sky-200 bg-sky-400/10',
  ERROR: 'border-rose-400/40 text-rose-200 bg-rose-400/10',
};

export default function App() {
  const orchestratorState = useAppStore((state) => state.orchestratorState);
  const sessionId = useAppStore((state) => state.sessionId);
  const taskStatuses = useAppStore((state) => state.taskStatuses);
  const pendingInteractions = useAppStore((state) => state.pendingInteractions);
  const lastError = useAppStore((state) => state.lastError);
  const taskCount = Object.keys(taskStatuses).length;

  useEffect(() => {
    const cleanup = connectIpcToStore();
    return cleanup;
  }, []);

  return (
    <div className="min-h-screen bg-ink text-iron">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-ash">
              Vibeteam
            </p>
            <h1 className="font-display text-4xl tracking-tight text-iron md:text-5xl">
              Desktop Control Room
            </h1>
            <p className="max-w-xl text-sm text-ash">
              A focused workspace for orchestrating workflows, reviewing task
              signals, and shaping the next execution run.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-slate/70 px-5 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-6 text-xs uppercase tracking-[0.25em] text-ash">
              <span>Status</span>
              <span>Session</span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[orchestratorState] ?? statusStyles.IDLE}`}
              >
                {orchestratorState.replaceAll('_', ' ')}
              </span>
              <span className="text-xs text-iron">
                {sessionId ?? 'No active session'}
              </span>
            </div>
          </div>
        </header>

        <main className="mt-10 grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-6">
            <section className="reveal rounded-2xl border border-border bg-graphite/70 p-5">
              <h2 className="text-xs uppercase tracking-[0.3em] text-ash">
                System Pulse
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-ash">
                  <span>Tracked tasks</span>
                  <span className="text-iron">{taskCount}</span>
                </div>
                <div className="flex items-center justify-between text-ash">
                  <span>Pending prompts</span>
                  <span className="text-iron">{pendingInteractions.length}</span>
                </div>
                <div className="rounded-lg border border-border bg-ink/60 p-3 text-xs text-ash">
                  IPC bridge online. Awaiting workflow dispatch.
                </div>
              </div>
            </section>

            <section className="reveal reveal-delay-1 rounded-2xl border border-border bg-graphite/70 p-5">
              <h2 className="text-xs uppercase tracking-[0.3em] text-ash">
                Recent Workflows
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-ash">
                <li className="flex items-center justify-between rounded-lg border border-border bg-ink/60 px-3 py-2">
                  <span>Agent onboarding</span>
                  <span className="text-xs text-iron">Draft</span>
                </li>
                <li className="flex items-center justify-between rounded-lg border border-border bg-ink/60 px-3 py-2">
                  <span>Release runbook</span>
                  <span className="text-xs text-iron">Queued</span>
                </li>
                <li className="flex items-center justify-between rounded-lg border border-border bg-ink/60 px-3 py-2">
                  <span>Infra audit</span>
                  <span className="text-xs text-iron">Paused</span>
                </li>
              </ul>
            </section>
          </aside>

          <section className="space-y-6">
            <div className="reveal reveal-delay-2 rounded-3xl border border-border bg-slate/70 p-6 md:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-ash">
                    Active Workspace
                  </p>
                  <h2 className="font-display text-3xl text-iron">
                    No workflow selected
                  </h2>
                  <p className="text-sm text-ash">
                    Start a session to surface live task output, pending
                    interactions, and orchestration telemetry.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="rounded-full border border-border bg-ink/70 px-4 py-2 text-xs uppercase tracking-[0.25em] text-ash transition hover:border-iron hover:text-iron">
                    Load workflow
                  </button>
                  <button className="rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-amber-200 transition hover:border-amber-300 hover:text-amber-100">
                    Create new
                  </button>
                </div>
              </div>
              {lastError ? (
                <div className="mt-6 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {lastError.message}
                </div>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {['Orchestrator', 'Task Stream', 'Human Input'].map((label) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-border bg-ink/60 p-4 text-xs text-ash"
                    >
                      <p className="uppercase tracking-[0.3em]">{label}</p>
                      <p className="mt-2 text-sm text-iron">
                        Standby. Awaiting first signal.
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="reveal reveal-delay-3 rounded-3xl border border-border bg-graphite/70 p-6 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-ash">
                    Guidance
                  </p>
                  <h3 className="font-display text-2xl text-iron">
                    Map the next execution
                  </h3>
                  <p className="text-sm text-ash">
                    Define your workflow, then dispatch through IPC to receive
                    real-time event updates in this view.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-ink/60 px-5 py-4 text-xs text-ash">
                  IPC types and event contracts are ready. Wire them to your
                  orchestrator in the next change.
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
