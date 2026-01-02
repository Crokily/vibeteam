import { SessionManager } from '../state/SessionManager';

/**
 * Records the initial prompt in session history.
 * Prompts are now injected via CLI arguments, so no stdin dispatch is needed.
 */
export const recordInitialPrompt = (
  sessionManager: SessionManager,
  taskId: string,
  prompt?: string,
): void => {
  if (prompt) {
    sessionManager.addHistory(prompt.trim(), taskId);
  }
};
