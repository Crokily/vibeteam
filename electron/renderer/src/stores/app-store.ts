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
};

type SessionMode = 'live' | 'view';

const buildWorkflowView = (workflow: WorkflowDefinition) => {
  const taskMeta: Record<string, TaskMeta> = {};
  const workflowStages: WorkflowStageView[] = workflow.stages.map((stage, stageIndex) => {
    const taskIds = stage.tasks.map((task) => {
      taskMeta[task.id] = {
        executionMode: task.executionMode ?? 'interactive',
        label: task.name ?? task.id,
        stageIndex,
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

interface AppState {
  connected: boolean;
  orchestratorState: OrchestratorState;
  sessionId: string | null;
  sessionMode: SessionMode;
  workflow: WorkflowDefinition | null;
  workflowStages: WorkflowStageView[];
  taskStatuses: Record<string, TaskStatus>;
  taskMeta: Record<string, TaskMeta>;
  taskOutputs: Record<string, { raw: string[]; cleaned: string[] }>;
  pendingInteractions: InteractionNeeded[];
  activeTaskId: string | null;
  lastError: OrchestratorError | null;
  sessions: SessionSummary[];
}

interface AppActions {
  setConnected: (connected: boolean) => void;
  applyStateChange: (payload: OrchestratorStateChange) => void;
  setWorkflow: (workflow: WorkflowDefinition, sessionId: string | null) => void;
  loadSessionSnapshot: (snapshot: WorkflowSessionSnapshot) => void;
  setSessions: (sessions: SessionSummary[]) => void;
  updateTaskStatus: (payload: TaskStatusChange) => void;
  appendTaskOutput: (payload: TaskOutput) => void;
  addInteraction: (payload: InteractionNeeded) => void;
  resolveInteraction: (taskId: string) => void;
  setActiveTaskId: (taskId: string | null) => void;
  setError: (payload: OrchestratorError) => void;
  clearError: () => void;
  clearTaskOutputs: () => void;
}

export const useAppStore = create<AppState & AppActions>((set) => ({
  connected: false,
  orchestratorState: 'IDLE',
  sessionId: null,
  sessionMode: 'live',
  workflow: null,
  workflowStages: [],
  taskStatuses: {},
  taskMeta: {},
  taskOutputs: {},
  pendingInteractions: [],
  activeTaskId: null,
  lastError: null,
  sessions: [],
  setConnected: (connected) => set({ connected }),
  applyStateChange: (payload) =>
    set({
      orchestratorState: payload.current,
      sessionId: payload.sessionId,
    }),
  setWorkflow: (workflow, sessionId) =>
    set(() => {
      const { workflowStages, taskMeta, firstTaskId } = buildWorkflowView(workflow);
      const taskStatuses = buildTaskStatuses(workflow);
      return {
        sessionId,
        sessionMode: 'live',
        workflow,
        workflowStages,
        taskStatuses,
        taskMeta,
        taskOutputs: {},
        pendingInteractions: [],
        activeTaskId: firstTaskId,
      };
    }),
  loadSessionSnapshot: (snapshot) =>
    set(() => {
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
        .map(([taskId]) => ({ taskId }));

      return {
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
      };
    }),
  setSessions: (sessions) => set({ sessions }),
  updateTaskStatus: (payload) =>
    set((state) => ({
      taskStatuses: {
        ...state.taskStatuses,
        [payload.taskId]: payload.status,
      },
    })),
  appendTaskOutput: (payload) =>
    set((state) => ({
      taskOutputs: {
        ...state.taskOutputs,
        [payload.taskId]: {
          raw: [
            ...(state.taskOutputs[payload.taskId]?.raw ?? []),
            payload.raw,
          ],
          cleaned: [
            ...(state.taskOutputs[payload.taskId]?.cleaned ?? []),
            payload.cleaned,
          ],
        },
      },
    })),
  addInteraction: (payload) =>
    set((state) => ({
      pendingInteractions: [
        ...state.pendingInteractions.filter(
          (interaction) => interaction.taskId !== payload.taskId
        ),
        payload,
      ],
    })),
  resolveInteraction: (taskId) =>
    set((state) => ({
      pendingInteractions: state.pendingInteractions.filter(
        (interaction) => interaction.taskId !== taskId
      ),
    })),
  setActiveTaskId: (taskId) => set({ activeTaskId: taskId }),
  setError: (payload) => set({ lastError: payload }),
  clearError: () => set({ lastError: null }),
  clearTaskOutputs: () => set({ taskOutputs: {} }),
}));
