export const buildHeadlessArgs = (headlessArgs: string[], prompt: string): string[] => {
  const withoutApproval = stripApprovalArgs(headlessArgs);
  const withoutPrompt = stripPromptArgs(withoutApproval);
  const withoutChat = withoutPrompt.filter((arg) => arg !== 'chat');

  return [...withoutChat, '--approval-mode', 'yolo', prompt];
};

const stripPromptArgs = (args: string[]): string[] => {
  const result: string[] = [];
  let skipNext = false;

  for (const arg of args) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (arg === '--prompt' || arg === '-p') {
      skipNext = true;
      continue;
    }
    if (arg.startsWith('--prompt=')) {
      continue;
    }
    result.push(arg);
  }

  return result;
};

const stripApprovalArgs = (args: string[]): string[] => {
  const result: string[] = [];
  let skipNext = false;

  for (const arg of args) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (arg === '--approval-mode') {
      skipNext = true;
      continue;
    }
    if (arg.startsWith('--approval-mode=')) {
      continue;
    }
    result.push(arg);
  }

  return result;
};
