import { adapterRegistry } from '../../adapters/registry';
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
      if (!task.adapter || typeof task.adapter !== 'string' || !task.adapter.trim()) {
        throw new Error(
          `Workflow task "${task.id}" adapter must be a non-empty string.`,
        );
      }
      if (!adapterRegistry.has(task.adapter)) {
        throw new Error(
          `Workflow task "${task.id}" adapter type "${task.adapter}" is not registered.`,
        );
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
      if (task.name !== undefined && typeof task.name !== 'string') {
        throw new Error(`Workflow task "${task.id}" name must be a string.`);
      }
      if (task.cwd !== undefined && typeof task.cwd !== 'string') {
        throw new Error(`Workflow task "${task.id}" cwd must be a string.`);
      }
      if (
        task.env !== undefined &&
        (typeof task.env !== 'object' || task.env === null || Array.isArray(task.env))
      ) {
        throw new Error(`Workflow task "${task.id}" env must be an object.`);
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
