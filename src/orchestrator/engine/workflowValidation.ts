import { WorkflowDefinition } from '../types';

export const validateWorkflow = (workflow: WorkflowDefinition): void => {
  if (!workflow.stages || workflow.stages.length === 0) {
    throw new Error('Workflow must contain at least one stage.');
  }

  const seenTaskIds = new Set<string>();

  for (const stage of workflow.stages) {
    if (!stage.tasks || stage.tasks.length === 0) {
      throw new Error(`Stage "${stage.id}" must contain at least one task.`);
    }

    for (const task of stage.tasks) {
      if (!task.id || !task.id.trim()) {
        throw new Error('Workflow task is missing an id.');
      }
      if (
        task.executionMode !== undefined &&
        task.executionMode !== 'interactive' &&
        task.executionMode !== 'headless'
      ) {
        throw new Error(
          `Workflow task "${task.id}" executionMode must be "interactive" or "headless".`,
        );
      }
      if (task.prompt !== undefined && typeof task.prompt !== 'string') {
        throw new Error(
          `Workflow task "${task.id}" prompt must be a string.`,
        );
      }
      if (
        task.executionMode === 'headless' &&
        (!task.prompt || !task.prompt.trim())
      ) {
        throw new Error(
          `Workflow task "${task.id}" prompt is required for headless mode.`,
        );
      }
      if (task.extraArgs !== undefined) {
        if (!Array.isArray(task.extraArgs)) {
          throw new Error(
            `Workflow task "${task.id}" extraArgs must be an array.`,
          );
        }
        for (let i = 0; i < task.extraArgs.length; i++) {
          if (typeof task.extraArgs[i] !== 'string') {
            throw new Error(
              `Workflow task "${task.id}" extraArgs[${i}] must be a string.`,
            );
          }
        }
      }
      if (seenTaskIds.has(task.id)) {
        throw new Error(`Workflow task id "${task.id}" must be unique.`);
      }
      seenTaskIds.add(task.id);
    }
  }
};
