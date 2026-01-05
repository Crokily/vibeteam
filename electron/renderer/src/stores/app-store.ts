import { create } from 'zustand';
import type {
  InteractionNeeded,
  OrchestratorError,
  OrchestratorState,
  OrchestratorStateChange,
  TaskOutput,
  TaskStatus,
  TaskStatusChange,
} from '../../../shared/ipc-types';

interface AppState {
  connected: boolean;
  orchestratorState: OrchestratorState;
  sessionId: string | null;
  taskStatuses: Record<string, TaskStatus>;
  taskOutputs: Record<string, { raw: string[]; cleaned: string[] }>;
  pendingInteractions: InteractionNeeded[];
  activeTaskId: string | null;
  lastError: OrchestratorError | null;
}

interface AppActions {
  setConnected: (connected: boolean) => void;
  applyStateChange: (payload: OrchestratorStateChange) => void;
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
  taskStatuses: {},
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
