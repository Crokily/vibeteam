import { useEffect, useMemo } from 'react';
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
  const workflowStages = useAppStore((state) => state.workflowStages);
  const taskStatuses = useAppStore((state) => state.taskStatuses);
  const taskMeta = useAppStore((state) => state.taskMeta);
  const pendingInteractions = useAppStore((state) => state.pendingInteractions);
  const activeTaskId = useAppStore((state) => state.activeTaskId);
  const setActiveTaskId = useAppStore((state) => state.setActiveTaskId);
  const resolveInteraction = useAppStore((state) => state.resolveInteraction);

  useEffect(() => {
    const cleanup = connectIpcToStore();
    return cleanup;
  }, []);

  const taskIds = useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();

    if (workflowStages.length > 0) {
      workflowStages.forEach((stage) => {
        stage.taskIds.forEach((taskId) => {
          if (seen.has(taskId)) {
            return;
          }
          seen.add(taskId);
          ordered.push(taskId);
        });
      });
    }

    Object.keys(taskStatuses).forEach((taskId) => {
      if (seen.has(taskId)) {
        return;
      }
      seen.add(taskId);
      ordered.push(taskId);
    });

    pendingInteractions.forEach((interaction) => {
      if (seen.has(interaction.taskId)) {
        return;
      }
      seen.add(interaction.taskId);
      ordered.push(interaction.taskId);
    });

    return ordered;
  }, [pendingInteractions, taskStatuses, workflowStages]);
  const attentionTaskIds = useMemo(
    () => new Set(pendingInteractions.map((interaction) => interaction.taskId)),
    [pendingInteractions]
  );

  useEffect(() => {
    if (!activeTaskId && taskIds.length > 0) {
      setActiveTaskId(taskIds[0]);
    }
  }, [activeTaskId, setActiveTaskId, taskIds]);

  const resolvedActiveTaskId = activeTaskId ?? taskIds[0] ?? null;
  const sidebarStages = useMemo(() => {
    if (workflowStages.length > 0) {
      return workflowStages;
    }
    if (taskIds.length === 0) {
      return [];
    }
    return [{ id: 'workflow', index: 0, taskIds }];
  }, [taskIds, workflowStages]);

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
          stages={sidebarStages}
          taskMeta={taskMeta}
          taskStatuses={taskStatuses}
          activeTaskId={resolvedActiveTaskId}
          pendingCount={pendingInteractions.length}
          onSelectTask={setActiveTaskId}
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
              label: taskMeta[taskId]?.label ?? taskId,
              isActive: taskId === resolvedActiveTaskId,
              needsAttention:
                attentionTaskIds.has(taskId) ||
                taskStatuses[taskId] === 'WAITING_FOR_USER',
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
                  taskMeta[taskId]?.executionMode !== 'headless' &&
                  (taskStatuses[taskId] === 'RUNNING' ||
                    taskStatuses[taskId] === 'WAITING_FOR_USER')
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
