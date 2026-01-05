import { create } from 'zustand';
import type {
  ExecutionMode,
  InteractionNeeded,
  OrchestratorError,
  OrchestratorState,
  OrchestratorStateChange,
  TaskOutput,
  TaskStatus,
  TaskStatusChange,
  WorkflowDefinition,
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

interface AppState {
  connected: boolean;
  orchestratorState: OrchestratorState;
  sessionId: string | null;
  workflow: WorkflowDefinition | null;
  workflowStages: WorkflowStageView[];
  taskStatuses: Record<string, TaskStatus>;
  taskMeta: Record<string, TaskMeta>;
  taskOutputs: Record<string, { raw: string[]; cleaned: string[] }>;
  pendingInteractions: InteractionNeeded[];
  activeTaskId: string | null;
  lastError: OrchestratorError | null;
}

interface AppActions {
  setConnected: (connected: boolean) => void;
  applyStateChange: (payload: OrchestratorStateChange) => void;
  setWorkflow: (workflow: WorkflowDefinition, sessionId: string | null) => void;
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
  workflow: null,
  workflowStages: [],
  taskStatuses: {},
  taskMeta: {},
  taskOutputs: {},
  pendingInteractions: [],
  activeTaskId: null,
  lastError: null,
  setConnected: (connected) => set({ connected }),
  applyStateChange: (payload) =>
    set({
      orchestratorState: payload.current,
      sessionId: payload.sessionId,
    }),
  setWorkflow: (workflow, sessionId) =>
    set(() => {
      const taskStatuses: Record<string, TaskStatus> = {};
      const taskMeta: Record<string, TaskMeta> = {};
      const workflowStages: WorkflowStageView[] = workflow.stages.map(
        (stage, stageIndex) => {
          const taskIds = stage.tasks.map((task) => {
            taskStatuses[task.id] = 'PENDING';
            taskMeta[task.id] = {
              executionMode: task.executionMode ?? 'interactive',
              label: task.name ?? task.id,
              stageIndex,
            };
            return task.id;
          });
          return { id: stage.id, index: stageIndex, taskIds };
        }
      );
      const firstTaskId = workflowStages[0]?.taskIds[0] ?? null;
      return {
        sessionId,
        workflow,
        workflowStages,
        taskStatuses,
        taskMeta,
        taskOutputs: {},
        pendingInteractions: [],
        activeTaskId: firstTaskId,
      };
    }),
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
