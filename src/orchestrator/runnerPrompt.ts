import { SessionManager } from './SessionManager';
import { RunnerContext } from './types';

type PromptOptions = {
  output?: string;
  force?: boolean;
};

const INITIAL_PROMPT_TIMEOUT_MS = 1500;
const READY_OUTPUT_PATTERNS = [
  /type your message/i,
  /ready for your command/i,
  /let me know/i,
];

export const prepareInitialPrompt = (
  context: RunnerContext,
  sessionManager: SessionManager,
  sendInput: (context: RunnerContext, input: string) => void,
): void => {
  const prompt = context.prompt?.trim();
  if (!prompt) {
    return;
  }

  if (context.executionMode === 'headless') {
    if (context.promptInLaunch) {
      sessionManager.addHistory(prompt, context.taskId);
    } else {
      sendInput(context, prompt);
    }
    context.initialPromptSent = true;
    return;
  }

  context.initialPromptTimer = setTimeout(() => {
    maybeSendInitialPrompt(context, sendInput, { force: true });
  }, INITIAL_PROMPT_TIMEOUT_MS);
};

export const maybeSendInitialPrompt = (
  context: RunnerContext,
  sendInput: (context: RunnerContext, input: string) => void,
  options: PromptOptions = {},
): void => {
  if (context.executionMode !== 'interactive' || context.initialPromptSent) {
    return;
  }

  const prompt = context.prompt?.trim();
  if (!prompt) {
    return;
  }

  if (!options.force) {
    if (!options.output) {
      return;
    }
    const ready = READY_OUTPUT_PATTERNS.some((pattern) =>
      pattern.test(options.output ?? ''),
    );
    if (!ready) {
      return;
    }
  }

  sendInput(context, prompt);
  context.initialPromptSent = true;

  if (context.initialPromptTimer) {
    clearTimeout(context.initialPromptTimer);
    context.initialPromptTimer = null;
  }
};
