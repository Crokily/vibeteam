import { useAppStore } from './app-store';

export const connectIpcToStore = (): (() => void) => {
  if (!window.electronAPI) {
    return () => undefined;
  }

  const {
    setConnected,
    applyStateChange,
    setWorkflow,
    updateTaskStatus,
    appendTaskOutput,
    addInteraction,
    setError,
  } = useAppStore.getState();

  const handleError = (payload: Parameters<typeof setError>[0]) => {
    console.error('[orchestrator:error]', payload);
    setError(payload);
  };

  setConnected(true);

  const unsubscribers = [
    window.electronAPI.events.on('orchestrator:stateChange', applyStateChange),
    window.electronAPI.events.on(
      'orchestrator:workflowStarted',
      ({ sessionId, workflow }) => {
        if (!sessionId) {
          return;
        }
        setWorkflow(workflow, sessionId);
      }
    ),
    window.electronAPI.events.on('orchestrator:taskStatusChange', updateTaskStatus),
    window.electronAPI.events.on('orchestrator:taskOutput', appendTaskOutput),
    window.electronAPI.events.on('orchestrator:interactionNeeded', addInteraction),
    window.electronAPI.events.on('orchestrator:error', handleError),
  ];

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    useAppStore.getState().setConnected(false);
  };
};
