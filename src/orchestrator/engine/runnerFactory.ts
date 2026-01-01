import { AgentLaunchConfig, IAgentAdapter } from '../../adapters/IAgentAdapter';
import { AgentRunner } from '../../core/AgentRunner';
import { HeadlessRunner } from '../../core/HeadlessRunner';
import { AgentRunnerLike, ExecutionMode, RunnerFactory } from '../types';

export type LaunchConfigResult = {
  launchConfig: AgentLaunchConfig;
  promptInLaunch: boolean;
};

export const resolveLaunchConfig = (
  adapter: IAgentAdapter,
  executionMode: ExecutionMode,
  prompt?: string,
): LaunchConfigResult => {
  if (executionMode === 'headless' && prompt && adapter.getHeadlessLaunchConfig) {
    return {
      launchConfig: adapter.getHeadlessLaunchConfig(prompt),
      promptInLaunch: true,
    };
  }

  return {
    launchConfig: adapter.getLaunchConfig(),
    promptInLaunch: false,
  };
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
