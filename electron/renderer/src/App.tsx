import { useEffect, useMemo, useRef } from 'react';
import { Header } from './components/layout/Header';
import { MainLayout } from './components/layout/MainLayout';
import { Sidebar } from './components/layout/Sidebar';
import { TerminalTabs } from './components/terminal/TerminalTabs';
import { XTermTerminal } from './components/terminal/XTermTerminal';
import { useAppStore } from './stores/app-store';
import { connectIpcToStore } from './stores/ipc-sync';

export default function App() {
  const orchestratorState = useAppStore((state) => state.orchestratorState);
  const sessionId = useAppStore((state) => state.sessionId);
  const taskStatuses = useAppStore((state) => state.taskStatuses);
  const pendingInteractions = useAppStore((state) => state.pendingInteractions);
  const activeTaskId = useAppStore((state) => state.activeTaskId);
  const setActiveTaskId = useAppStore((state) => state.setActiveTaskId);
  const resolveInteraction = useAppStore((state) => state.resolveInteraction);

  useEffect(() => {
    const cleanup = connectIpcToStore();
    return cleanup;
  }, []);

  const taskIds = useMemo(() => {
    const ids = new Set(Object.keys(taskStatuses));
    pendingInteractions.forEach((interaction) => {
      ids.add(interaction.taskId);
    });
    return Array.from(ids);
  }, [pendingInteractions, taskStatuses]);
  const attentionTaskIds = useMemo(
    () => new Set(pendingInteractions.map((interaction) => interaction.taskId)),
    [pendingInteractions]
  );

  useEffect(() => {
    if (!activeTaskId && taskIds.length > 0) {
      setActiveTaskId(taskIds[0]);
    }
  }, [activeTaskId, setActiveTaskId, taskIds]);

  const lastInteractionCount = useRef(0);
  useEffect(() => {
    if (pendingInteractions.length === 0) {
      lastInteractionCount.current = 0;
      return;
    }

    if (pendingInteractions.length > lastInteractionCount.current) {
      const latest = pendingInteractions[pendingInteractions.length - 1];
      if (latest && latest.taskId !== activeTaskId) {
        setActiveTaskId(latest.taskId);
      }
    }

    lastInteractionCount.current = pendingInteractions.length;
  }, [activeTaskId, pendingInteractions, setActiveTaskId]);

  const resolvedActiveTaskId = activeTaskId ?? taskIds[0] ?? null;

  return (
    <MainLayout
      header={
        <Header
          orchestratorState={orchestratorState}
          sessionId={sessionId}
        />
      }
      sidebar={
        <Sidebar
          taskIds={taskIds}
          taskStatuses={taskStatuses}
          activeTaskId={resolvedActiveTaskId}
          pendingCount={pendingInteractions.length}
        />
      }
    >
      {taskIds.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-border bg-ink/50">
          <span className="text-sm text-ash">No active tasks</span>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-slate/70">
          <TerminalTabs
            tabs={taskIds.map((taskId) => ({
              id: taskId,
              label: taskId,
              isActive: taskId === resolvedActiveTaskId,
              needsAttention: attentionTaskIds.has(taskId),
            }))}
            onSelect={setActiveTaskId}
          />
          <div className="relative flex-1 min-h-0 bg-ink/60">
            {taskIds.map((taskId) => (
              <XTermTerminal
                key={taskId}
                taskId={taskId}
                active={taskId === resolvedActiveTaskId}
                canInteract={
                  taskStatuses[taskId] === 'RUNNING' ||
                  taskStatuses[taskId] === 'WAITING_FOR_USER'
                }
                onInteractionSubmitted={resolveInteraction}
              />
            ))}
          </div>
        </div>
      )}
    </MainLayout>
  );
}
