import { AgentLaunchConfig, ExecutionMode, IAgentAdapter } from '../../adapters/IAgentAdapter';
import { AgentRunner } from '../../core/AgentRunner';
import { HeadlessRunner } from '../../core/HeadlessRunner';
import { AgentRunnerLike, RunnerFactory } from '../types';

export const resolveLaunchConfig = (
  adapter: IAgentAdapter,
  executionMode: ExecutionMode,
  prompt?: string,
  extraArgs?: string[],
): AgentLaunchConfig => {
  return adapter.getLaunchConfig(executionMode, prompt, extraArgs);
};

export const createRunner = (
  runnerFactory: RunnerFactory | undefined,
  adapter: IAgentAdapter,
  taskId: string,
  launchConfig: AgentLaunchConfig,
  executionMode: ExecutionMode,
  prompt?: string,
): AgentRunnerLike => {
  if (runnerFactory) {
    return runnerFactory(adapter, taskId, launchConfig, {
      executionMode,
      prompt,
    });
  }

  if (executionMode === 'headless') {
    return new HeadlessRunner(adapter, launchConfig);
  }

  return new AgentRunner(adapter, launchConfig);
};
