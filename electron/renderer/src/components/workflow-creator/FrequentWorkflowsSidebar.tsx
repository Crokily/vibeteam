import { useEffect, useMemo, useState } from 'react';
import type {
  WorkflowDefinition,
  WorkflowUsageEntry,
} from '../../../../shared/ipc-types';
import { ipcClient } from '../../lib/ipc-client';

import { AdapterIcon } from './icons';

type FrequentWorkflowsSidebarProps = {
  isOpen: boolean;
  adapterLookup: Record<string, { displayName: string; icon: string }>;
  onSelectWorkflow: (definition: WorkflowDefinition) => void;
};

const workflowLimit = 10;
const maxIcons = 4;

const flattenWorkflowTasks = (definition: WorkflowDefinition) =>
  definition.stages.flatMap((stage) => stage.tasks);

export const FrequentWorkflowsSidebar = ({
  isOpen,
  adapterLookup,
  onSelectWorkflow,
}: FrequentWorkflowsSidebarProps) => {
  const [workflows, setWorkflows] = useState<WorkflowUsageEntry[]>([]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    let isMounted = true;
    ipcClient.stats
      .getTopWorkflows(workflowLimit)
      .then((entries) => {
        if (!isMounted) {
          return;
        }
        setWorkflows(entries);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setWorkflows([]);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const items = useMemo(
    () =>
      workflows.map((entry) => {
        const tasks = flattenWorkflowTasks(entry.definition);
        const prompt =
          tasks.find((task) => task.prompt?.trim())?.prompt?.trim() ??
          'Untitled workflow';
        const icons = tasks.map((task) => adapterLookup[task.adapter]?.icon ?? 'adapter');
        return {
          entry,
          prompt,
          icons,
        };
      }),
    [adapterLookup, workflows],
  );

  return (
    <div className="rounded-3xl border border-border/60 bg-ink/60 px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.3em] text-ash">
        Frequent Workflows
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-ink/70 px-3 py-3 text-[11px] text-ash/70">
            No frequent workflows yet.
          </div>
        ) : (
          items.map(({ entry, prompt, icons }) => (
            <button
              key={entry.hash}
              onClick={() => onSelectWorkflow(entry.definition)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-ink/70 px-3 py-3 text-left text-ash transition hover:border-amber-300/60 hover:text-iron"
              type="button"
            >
              <span className="flex items-center -space-x-2">
                {icons.slice(0, maxIcons).map((icon, index) => (
                  <span
                    key={`${entry.hash}-${index}`}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 bg-graphite/80 text-iron"
                  >
                    <AdapterIcon name={icon} className="h-4 w-4" />
                  </span>
                ))}
                {icons.length > maxIcons ? (
                  <span className="ml-3 text-[10px] text-ash/70">
                    +{icons.length - maxIcons}
                  </span>
                ) : null}
              </span>
              <span className="min-w-0 flex-1 text-[11px] text-iron/90">
                <span className="block truncate" title={prompt}>
                  {prompt}
                </span>
              </span>
              <span className="rounded-full border border-border/60 bg-ink/70 px-2 py-1 text-[10px] text-ash/70">
                {entry.count}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
