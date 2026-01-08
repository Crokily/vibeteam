import { create } from 'zustand';
import type {
  ExecutionMode,
  InteractionNeeded,
  OrchestratorError,
  OrchestratorState,
  OrchestratorStateChange,
  SessionSummary,
  TaskOutput,
  TaskStatus,
  TaskStatusChange,
  WorkflowDefinition,
  WorkflowSessionSnapshot,
} from '../../../shared/ipc-types';

type WorkflowStageView = {
  id: string;
  index: number;
  taskIds: string[];
};

type TaskMeta = {
  executionMode: ExecutionMode;
  label: string;
  stageIndex: number;
  adapter: string;
};

type SessionMode = 'live' | 'view';
export type SessionLayout = 'minimized' | 'standard' | 'expanded';

export type SessionState = {
  sessionId: string;
  sessionMode: SessionMode;
  orchestratorState: OrchestratorState;
  workflow: WorkflowDefinition | null;
  workflowStages: WorkflowStageView[];
  taskStatuses: Record<string, TaskStatus>;
  taskMeta: Record<string, TaskMeta>;
  taskOutputs: Record<string, { raw: string[]; cleaned: string[] }>;
  pendingInteractions: InteractionNeeded[];
  activeTaskId: string | null;
  layout: SessionLayout;
};

const buildWorkflowView = (workflow: WorkflowDefinition) => {
  const taskMeta: Record<string, TaskMeta> = {};
  const workflowStages: WorkflowStageView[] = workflow.stages.map((stage, stageIndex) => {
    const taskIds = stage.tasks.map((task) => {
      let label = task.name;

      if (!label && task.prompt) {
        const prompt = task.prompt.trim();
        // Use first 60 chars of prompt + ... if it's long
        // Remove newlines to keep it clean in the UI
        const cleanPrompt = prompt.split('\n')[0].trim();
        label = cleanPrompt.length > 60 
          ? cleanPrompt.substring(0, 57) + '...' 
          : cleanPrompt;
      }

      if (!label && task.adapter) {
        // Fallback to adapter name (e.g. "shell_command" -> "Shell Command")
        label = task.adapter
          .split(/[_-]/)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' ');
      }

      taskMeta[task.id] = {
        executionMode: task.executionMode ?? 'interactive',
        label: label ?? task.id,
        stageIndex,
        adapter: task.adapter,
      };
      return task.id;
    });
    return { id: stage.id, index: stageIndex, taskIds };
  });
  const firstTaskId = workflowStages[0]?.taskIds[0] ?? null;
  return { workflowStages, taskMeta, firstTaskId };
};

const buildTaskStatuses = (workflow: WorkflowDefinition): Record<string, TaskStatus> => {
  const taskStatuses: Record<string, TaskStatus> = {};
  for (const stage of workflow.stages) {
    for (const task of stage.tasks) {
      taskStatuses[task.id] = 'PENDING';
    }
  }
  return taskStatuses;
};

const buildFallbackWorkflow = (
  snapshot: WorkflowSessionSnapshot
): WorkflowDefinition => {
  const taskIds = new Set([
    ...Object.keys(snapshot.taskStatus),
    ...Object.keys(snapshot.logs),
  ]);
  const tasks = [...taskIds].map((taskId) => ({
    id: taskId,
    adapter: 'unknown',
    executionMode: 'headless' as ExecutionMode,
    name: taskId,
  }));
  return {
    id: snapshot.id,
    goal: snapshot.goal,
    stages: [{ id: 'stage-0', tasks }],
  };
};

const buildTaskOutputs = (
  logs: Record<string, string[]>
): Record<string, { raw: string[]; cleaned: string[] }> => {
  const outputs: Record<string, { raw: string[]; cleaned: string[] }> = {};
  for (const [taskId, entries] of Object.entries(logs)) {
    const normalized = entries.map((entry) => `${entry}\n`);
    outputs[taskId] = { raw: normalized, cleaned: normalized };
  }
  return outputs;
};

const createSessionState = (sessionId: string): SessionState => ({
  sessionId,
  sessionMode: 'live',
  orchestratorState: 'IDLE',
  workflow: null,
  workflowStages: [],
  taskStatuses: {},
  taskMeta: {},
  taskOutputs: {},
  pendingInteractions: [],
  activeTaskId: null,
  layout: 'standard',
});

interface AppState {
  connected: boolean;
  activeSessionIds: string[];
  sessions: Record<string, SessionState>;
  lastError: OrchestratorError | null;
  sessionSummaries: SessionSummary[];
}

interface AppActions {
  setConnected: (connected: boolean) => void;
  applyStateChange: (payload: OrchestratorStateChange) => void;
  setWorkflow: (workflow: WorkflowDefinition, sessionId: string) => void;
  loadSessionSnapshot: (snapshot: WorkflowSessionSnapshot) => void;
  setSessions: (sessions: SessionSummary[]) => void;
  updateTaskStatus: (payload: TaskStatusChange) => void;
  appendTaskOutput: (payload: TaskOutput) => void;
  addInteraction: (payload: InteractionNeeded) => void;
  resolveInteraction: (sessionId: string, taskId: string) => void;
  setActiveTaskId: (sessionId: string, taskId: string | null) => void;
  setSessionLayout: (sessionId: string, layout: SessionLayout) => void;
  removeSession: (sessionId: string) => void;
  setError: (payload: OrchestratorError) => void;
  clearError: () => void;
  clearTaskOutputs: (sessionId: string) => void;
}

export const useAppStore = create<AppState & AppActions>((set) => ({
  connected: false,
  activeSessionIds: [],
  sessions: {},
  lastError: null,
  sessionSummaries: [],
  setConnected: (connected) => set({ connected }),
  applyStateChange: (payload) =>
    set((state) => {
      if (!payload.sessionId) {
        return state;
      }
      const current = state.sessions[payload.sessionId] ?? createSessionState(payload.sessionId);
      return {
        sessions: {
          ...state.sessions,
          [payload.sessionId]: {
            ...current,
            orchestratorState: payload.current,
          },
        },
      };
    }),
  setWorkflow: (workflow, sessionId) =>
    set((state) => {
      const current = state.sessions[sessionId] ?? createSessionState(sessionId);
      const { workflowStages, taskMeta, firstTaskId } = buildWorkflowView(workflow);
      const defaultStatuses = buildTaskStatuses(workflow);
      const taskStatuses: Record<string, TaskStatus> = {
        ...defaultStatuses,
        ...current.taskStatuses,
      };
      const pendingInteractionsByTaskId = new Map(
        current.pendingInteractions.map((interaction) => [interaction.taskId, interaction])
      );
      for (const [taskId, status] of Object.entries(taskStatuses)) {
        if (status !== 'WAITING_FOR_USER' || pendingInteractionsByTaskId.has(taskId)) {
          continue;
        }
        pendingInteractionsByTaskId.set(taskId, { sessionId, taskId });
      }
      const pendingInteractions = Array.from(pendingInteractionsByTaskId.values());
      const taskOutputs = Object.keys(current.taskOutputs).length > 0
        ? current.taskOutputs
        : {};
      const activeSessionIds = state.activeSessionIds.includes(sessionId)
        ? state.activeSessionIds
        : [...state.activeSessionIds, sessionId];
      const activeTaskId = current.activeTaskId ?? firstTaskId;

      return {
        activeSessionIds,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...current,
            sessionId,
            sessionMode: 'live',
            workflow,
            workflowStages,
            taskStatuses,
            taskMeta,
            taskOutputs,
            pendingInteractions,
            activeTaskId,
          },
        },
      };
    }),
  loadSessionSnapshot: (snapshot) =>
    set((state) => {
      const workflow = snapshot.workflowDefinition ?? buildFallbackWorkflow(snapshot);
      const { workflowStages, taskMeta, firstTaskId } = buildWorkflowView(workflow);
      const taskStatuses: Record<string, TaskStatus> = {
        ...snapshot.taskStatus,
      };
      for (const stage of workflow.stages) {
        for (const task of stage.tasks) {
          if (!taskStatuses[task.id]) {
            taskStatuses[task.id] = 'PENDING';
          }
        }
      }
      const pendingInteractions = Object.entries(taskStatuses)
        .filter(([, status]) => status === 'WAITING_FOR_USER')
        .map(([taskId]) => ({ sessionId: snapshot.id, taskId }));
      const activeSessionIds = state.activeSessionIds.includes(snapshot.id)
        ? state.activeSessionIds
        : [...state.activeSessionIds, snapshot.id];

      return {
        activeSessionIds,
        sessions: {
          ...state.sessions,
          [snapshot.id]: {
            sessionId: snapshot.id,
            sessionMode: 'view',
            orchestratorState: 'PAUSED',
            workflow,
            workflowStages,
            taskStatuses,
            taskMeta,
            taskOutputs: buildTaskOutputs(snapshot.logs),
            pendingInteractions,
            activeTaskId: firstTaskId,
            layout: state.sessions[snapshot.id]?.layout ?? 'standard',
          },
        },
      };
    }),
  setSessions: (sessions) => set({ sessionSummaries: sessions }),
  updateTaskStatus: (payload) =>
    set((state) => {
      const current = state.sessions[payload.sessionId] ?? createSessionState(payload.sessionId);
      return {
        sessions: {
          ...state.sessions,
          [payload.sessionId]: {
            ...current,
            taskStatuses: {
              ...current.taskStatuses,
              [payload.taskId]: payload.status,
            },
          },
        },
      };
    }),
  appendTaskOutput: (payload) =>
    set((state) => {
      const current = state.sessions[payload.sessionId] ?? createSessionState(payload.sessionId);
      return {
        sessions: {
          ...state.sessions,
          [payload.sessionId]: {
            ...current,
            taskOutputs: {
              ...current.taskOutputs,
              [payload.taskId]: {
                raw: [
                  ...(current.taskOutputs[payload.taskId]?.raw ?? []),
                  payload.raw,
                ],
                cleaned: [
                  ...(current.taskOutputs[payload.taskId]?.cleaned ?? []),
                  payload.cleaned,
                ],
              },
            },
          },
        },
      };
    }),
  addInteraction: (payload) =>
    set((state) => {
      const current = state.sessions[payload.sessionId] ?? createSessionState(payload.sessionId);
      const filtered = current.pendingInteractions.filter(
        (interaction) => interaction.taskId !== payload.taskId
      );
      return {
        sessions: {
          ...state.sessions,
          [payload.sessionId]: {
            ...current,
            pendingInteractions: [...filtered, payload],
          },
        },
      };
    }),
  resolveInteraction: (sessionId, taskId) =>
    set((state) => {
      const current = state.sessions[sessionId];
      if (!current) {
        return state;
      }
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...current,
            pendingInteractions: current.pendingInteractions.filter(
              (interaction) => interaction.taskId !== taskId
            ),
          },
        },
      };
    }),
  setActiveTaskId: (sessionId, taskId) =>
    set((state) => {
      const current = state.sessions[sessionId];
      if (!current) {
        return state;
      }
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...current,
            activeTaskId: taskId,
          },
        },
      };
    }),
  setSessionLayout: (sessionId, layout) =>
    set((state) => {
      const current = state.sessions[sessionId];
      if (!current) {
        return state;
      }
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...current,
            layout,
          },
        },
      };
    }),
  removeSession: (sessionId) =>
    set((state) => {
      if (!state.sessions[sessionId]) {
        return state;
      }
      const { [sessionId]: _, ...rest } = state.sessions;
      return {
        activeSessionIds: state.activeSessionIds.filter((id) => id !== sessionId),
        sessions: rest,
      };
    }),
  setError: (payload) => set({ lastError: payload }),
  clearError: () => set({ lastError: null }),
  clearTaskOutputs: (sessionId) =>
    set((state) => {
      const current = state.sessions[sessionId];
      if (!current) {
        return state;
      }
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...current,
            taskOutputs: {},
          },
        },
      };
    }),
}));
