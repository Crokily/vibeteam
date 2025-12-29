import { existsSync, mkdirSync, rmdirSync, unlinkSync } from 'fs';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EventEmitter } from 'events';

import { Orchestrator, WorkflowDefinition } from './Orchestrator';
import { WorkflowSession } from './WorkflowSession';
import { IAgentAdapter } from '../adapters/IAgentAdapter';

const TEST_DIR = path.join(__dirname, 'test-tmp');

class MockAdapter extends EventEmitter implements IAgentAdapter {
  readonly name = 'mock';
  getLaunchConfig() {
    return { command: 'echo', args: ['mock'] };
  }
}

class DelayedRunner extends EventEmitter {
  constructor(private readonly delay: number = 0) {
    super();
  }
  start() {
    setTimeout(() => {
      this.emit('event', { type: 'exit', code: 0, signal: null });
    }, this.delay);
  }
  stop() {}
  send() {}
  on(event: string, listener: any) { super.on(event, listener); }
  off(event: string, listener: any) { super.off(event, listener); }
}

describe('WorkflowEngine', () => {
  beforeAll(() => {
    if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR);
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      // simple cleanup (recursive in node 14+)
      rmdirSync(TEST_DIR, { recursive: true });
    }
  });

  it('persists session state to disk', () => {
    const session = WorkflowSession.create('test-goal');
    session.updateTaskStatus('task-1', 'RUNNING');
    session.save(TEST_DIR);

    const loaded = WorkflowSession.load(session.id, TEST_DIR);
    expect(loaded.id).toBe(session.id);
    expect(loaded.goal).toBe('test-goal');
    expect(loaded.taskStatus['task-1']).toBe('RUNNING');
  });

  it('executes stages sequentially', async () => {
    const adapter = new MockAdapter();
    const runner = new DelayedRunner(10); // fast runner
    const orchestrator = new Orchestrator({
      runnerFactory: () => runner,
    });

    const workflow: WorkflowDefinition = {
      id: 'seq-flow',
      stages: [
        { id: 's1', tasks: [{ id: 't1', adapter }] },
        { id: 's2', tasks: [{ id: 't2', adapter }] },
      ],
    };

    const session = await orchestrator.executeWorkflow(workflow, {});
    expect(session.currentStageIndex).toBe(2); // Completed both stages (index 0, 1 -> 2)
    expect(session.taskStatus['t1']).toBe('DONE');
    expect(session.taskStatus['t2']).toBe('DONE');
  });

  it('executes tasks in parallel within a stage', async () => {
    const adapter = new MockAdapter();
    const delays: number[] = [];
    
    // We want to verify start() is called roughly at the same time
    // We can't easily assert exact parallelism without real threads, 
    // but we can check that they are both started before either finishes if we control the runners.
    
    let activeCount = 0;
    let maxActive = 0;

    class TrackingRunner extends EventEmitter {
      start() {
        activeCount++;
        maxActive = Math.max(maxActive, activeCount);
        setTimeout(() => {
          activeCount--;
          this.emit('event', { type: 'exit', code: 0 });
        }, 20);
      }
      stop() {}
      send() {}
      on(event: string, listener: any) { super.on(event, listener); }
    }

    const orchestrator = new Orchestrator({
      runnerFactory: () => new TrackingRunner(),
    });

    const workflow: WorkflowDefinition = {
      id: 'parallel-flow',
      stages: [
        { 
          id: 's1', 
          tasks: [
            { id: 'p1', adapter },
            { id: 'p2', adapter },
            { id: 'p3', adapter }
          ] 
        },
      ],
    };

    await orchestrator.executeWorkflow(workflow, {});
    
    expect(maxActive).toBe(3); // All 3 should be active at once
  });
});
