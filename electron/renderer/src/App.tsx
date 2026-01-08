import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { NewWorkflowColumn } from './components/dashboard/NewWorkflowColumn';
import { WorkflowColumn } from './components/dashboard/WorkflowColumn';
import { Header } from './components/layout/Header';
import { WorkflowCreatorDialog } from './components/workflow-creator/WorkflowCreatorDialog';
import { ipcClient } from './lib/ipc-client';
import { type SessionLayout, useAppStore } from './stores/app-store';
import { connectIpcToStore } from './stores/ipc-sync';

export default function App() {
  const activeSessionIds = useAppStore((state) => state.activeSessionIds);
  const sessions = useAppStore((state) => state.sessions);
  const setSessionLayout = useAppStore((state) => state.setSessionLayout);
  const setActiveTaskId = useAppStore((state) => state.setActiveTaskId);
  const resolveInteraction = useAppStore((state) => state.resolveInteraction);
  const removeSession = useAppStore((state) => state.removeSession);

  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const columnRefs = useRef(new Map<string, HTMLDivElement | null>());
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | null>(
    null
  );
  const [isWorkflowDialogOpen, setWorkflowDialogOpen] = useState(false);

  useEffect(() => {
    const cleanup = connectIpcToStore();
    return cleanup;
  }, []);

  const registerColumnRef = useCallback((sessionId: string, node: HTMLDivElement | null) => {
    if (node) {
      columnRefs.current.set(sessionId, node);
      return;
    }
    columnRefs.current.delete(sessionId);
  }, []);

  const attentionSessionIds = useMemo(() => {
    return activeSessionIds.filter((sessionId) => {
      const session = sessions[sessionId];
      if (!session) {
        return false;
      }
      const hasPending = session.pendingInteractions.length > 0;
      const hasError = Object.values(session.taskStatuses).includes('ERROR');
      return hasPending || hasError;
    });
  }, [activeSessionIds, sessions]);

  const orderedSessionIds = useMemo(() => {
    const minimized: string[] = [];
    const others: string[] = [];
    activeSessionIds.forEach((sessionId) => {
      const session = sessions[sessionId];
      if (session?.layout === 'minimized') {
        minimized.push(sessionId);
      } else {
        others.push(sessionId);
      }
    });
    return [...minimized, ...others];
  }, [activeSessionIds, sessions]);

  const notificationCount = useMemo(() => {
    return attentionSessionIds.reduce((total, sessionId) => {
      const session = sessions[sessionId];
      if (!session) {
        return total;
      }
      const pending = session.pendingInteractions.length;
      const hasError = Object.values(session.taskStatuses).includes('ERROR');
      return total + pending + (hasError ? 1 : 0);
    }, 0);
  }, [attentionSessionIds, sessions]);

  const handleNotificationClick = useCallback(() => {
    const targetSessionId = attentionSessionIds[0];
    if (!targetSessionId) {
      return;
    }

    const node = columnRefs.current.get(targetSessionId);
    node?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    setHighlightedSessionId(targetSessionId);
    window.setTimeout(() => setHighlightedSessionId(null), 1400);
  }, [attentionSessionIds]);

  const setScrollRef = useCallback((node: HTMLDivElement | null) => {
    setScrollRoot((current) => (current === node ? current : node));
  }, []);

  const handleNewWorkflow = useCallback(() => {
    setWorkflowDialogOpen(true);
  }, []);

  const handleCloseWorkflowDialog = useCallback(() => {
    setWorkflowDialogOpen(false);
  }, []);

  const handleSelectTask = useCallback(
    (sessionId: string, taskId: string) => {
      setActiveTaskId(sessionId, taskId);
    },
    [setActiveTaskId]
  );

  const handleLayoutChange = useCallback(
    (sessionId: string, layout: SessionLayout) => {
      setSessionLayout(sessionId, layout);
    },
    [setSessionLayout]
  );

  const handleInteractionSubmitted = useCallback(
    (sessionId: string, taskId: string) => {
      resolveInteraction(sessionId, taskId);
    },
    [resolveInteraction]
  );

  const handleCloseSession = useCallback(
    (sessionId: string) => {
      const session = sessions[sessionId];
      if (!session) {
        return;
      }

      const isBusy =
        session.orchestratorState === 'RUNNING' ||
        session.orchestratorState === 'AWAITING_INTERACTION';
      const hasIncompleteTasks = Object.values(session.taskStatuses).some(
        (status) => status !== 'DONE'
      );
      if (isBusy || hasIncompleteTasks) {
        const confirmed = window.confirm(
          'This workflow is not finished. Stop it and close the column?'
        );
        if (!confirmed) {
          return;
        }
      }

      void ipcClient.workflow.stop(sessionId).catch(() => undefined);
      removeSession(sessionId);
    },
    [removeSession, sessions]
  );

  return (
    <>
      <DashboardLayout
        header={
          <Header
            activeCount={activeSessionIds.length}
            notificationCount={notificationCount}
            onNotificationClick={handleNotificationClick}
            onNewWorkflow={handleNewWorkflow}
          />
        }
        scrollRef={setScrollRef}
      >
        {orderedSessionIds.map((sessionId) => {
          const session = sessions[sessionId];
          if (!session) {
            return null;
          }
          return (
            <WorkflowColumn
              key={sessionId}
              session={session}
              scrollRoot={scrollRoot}
              isHighlighted={sessionId === highlightedSessionId}
              onLayoutChange={handleLayoutChange}
              onSelectTask={handleSelectTask}
              onClose={handleCloseSession}
              onInteractionSubmitted={handleInteractionSubmitted}
              registerRef={registerColumnRef}
            />
          );
        })}
        <NewWorkflowColumn onClick={handleNewWorkflow} />
      </DashboardLayout>
      <WorkflowCreatorDialog
        isOpen={isWorkflowDialogOpen}
        onClose={handleCloseWorkflowDialog}
      />
    </>
  );
}
