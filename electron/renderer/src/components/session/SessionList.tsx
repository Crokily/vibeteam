import { useEffect, useRef, useState } from 'react';
import type { SessionSummary, TaskStatus } from '../../../../shared/ipc-types';
import { ipcClient } from '../../lib/ipc-client';
import { useAppStore } from '../../stores/app-store';

const statusStyles: Record<TaskStatus, string> = {
  PENDING: 'border-border text-ash bg-ink/50',
  RUNNING: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10',
  WAITING_FOR_USER: 'border-amber-400/40 text-amber-200 bg-amber-400/10',
  DONE: 'border-border text-ash bg-ink/50',
  ERROR: 'border-rose-400/40 text-rose-200 bg-rose-400/10',
};

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const SessionList = () => {
  const sessions = useAppStore((state) => state.sessionSummaries);
  const setSessions = useAppStore((state) => state.setSessions);
  const loadSessionSnapshot = useAppStore((state) => state.loadSessionSnapshot);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);

  const refreshSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await ipcClient.session.list();
      setSessions(list);
    } catch {
      setError('Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (sessionId: string) => {
    setBusySessionId(sessionId);
    setError(null);
    try {
      const snapshot = await ipcClient.session.load(sessionId);
      loadSessionSnapshot(snapshot);
      setOpen(false);
    } catch {
      setError('Failed to load the session.');
    } finally {
      setBusySessionId(null);
    }
  };

  const handleResume = async (sessionId: string) => {
    setBusySessionId(sessionId);
    setError(null);
    try {
      const snapshot = await ipcClient.session.load(sessionId);
      loadSessionSnapshot(snapshot);
      await ipcClient.session.resume(sessionId);
      setOpen(false);
    } catch {
      setError('Failed to resume the session.');
    } finally {
      setBusySessionId(null);
    }
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    void refreshSessions();
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (event.target instanceof Node && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className="rounded-full border border-border bg-ink/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-ash transition hover:border-iron hover:text-iron"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Sessions
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-[360px] rounded-2xl border border-border bg-ink/95 p-4 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.9)]">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-ash">
            <span>Recent Sessions</span>
            <button
              onClick={() => void refreshSessions()}
              className="rounded-full border border-border bg-transparent px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-ash transition hover:border-iron hover:text-iron"
            >
              Refresh
            </button>
          </div>
          {error && (
            <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
              {error}
            </div>
          )}
          <div className="mt-3 max-h-[360px] space-y-3 overflow-auto pr-1">
            {loading && (
              <div className="rounded-xl border border-border/50 bg-ink/60 px-3 py-4 text-xs text-ash">
                Loading sessions...
              </div>
            )}
            {!loading && sessions.length === 0 && (
              <div className="rounded-xl border border-border/50 bg-ink/60 px-3 py-4 text-xs text-ash">
                No sessions found.
              </div>
            )}
            {!loading &&
              sessions.map((session: SessionSummary) => {
                const isBusy = busySessionId === session.id;
                const canResume = session.hasWorkflowDefinition && !isBusy;
                return (
                  <div
                    key={session.id}
                    className="rounded-xl border border-border/50 bg-slate/80 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-iron">
                          {session.goal || 'Untitled session'}
                        </div>
                        <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-ash">
                          Session ID
                        </div>
                        <div className="truncate text-[11px] text-ash">
                          {session.id}
                        </div>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusStyles[session.status]}`}
                      >
                        {session.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-ash">
                      <span>{formatTimestamp(session.updatedAt)}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void handleView(session.id)}
                          disabled={isBusy}
                          className="rounded-full border border-border/70 bg-transparent px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-ash transition hover:border-iron hover:text-iron disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          View
                        </button>
                        <button
                          onClick={() => void handleResume(session.id)}
                          disabled={!canResume}
                          className="rounded-full border border-border/70 bg-transparent px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-ash transition hover:border-emerald-300/60 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Resume
                        </button>
                      </div>
                    </div>
                    {!session.hasWorkflowDefinition && (
                      <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-ash/70">
                        Resume unavailable
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
