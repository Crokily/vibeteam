import { useEffect, useMemo, useState } from 'react';
import type {
  AgentUsageConfig,
  AgentUsageEntry,
} from '../../../../shared/ipc-types';
import { ipcClient } from '../../lib/ipc-client';

import { AdapterIcon } from '../icons';

type FrequentAgentsBarProps = {
  isOpen: boolean;
  adapterLookup: Record<string, { displayName: string; icon: string }>;
  onAddAgent: (config: AgentUsageConfig) => void;
};

const agentLimit = 10;

export const FrequentAgentsBar = ({
  isOpen,
  adapterLookup,
  onAddAgent,
}: FrequentAgentsBarProps) => {
  const [agents, setAgents] = useState<AgentUsageEntry[]>([]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    let isMounted = true;
    ipcClient.stats
      .getTopAgents(agentLimit)
      .then((entries) => {
        if (!isMounted) {
          return;
        }
        setAgents(entries);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setAgents([]);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const items = useMemo(
    () =>
      agents.map((entry) => {
        const meta = adapterLookup[entry.config.adapter];
        return {
          entry,
          label: meta?.displayName ?? entry.config.adapter,
          icon: meta?.icon ?? 'adapter',
          prompt: entry.config.prompt?.trim() || 'Untitled agent',
        };
      }),
    [adapterLookup, agents],
  );

  return (
    <div className="border-t border-border/60 bg-ink/60 px-6 py-4">
      <div className="text-[11px] uppercase tracking-[0.3em] text-ash">
        Frequent Agents
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-ink/70 px-3 py-3 text-[11px] text-ash/70">
            No frequent agents yet.
          </div>
        ) : (
          items.map(({ entry, label, icon, prompt }) => (
            <button
              key={entry.hash}
              onClick={() => onAddAgent(entry.config)}
              className="flex min-w-[220px] items-center gap-3 rounded-2xl border border-border/60 bg-ink/70 px-3 py-3 text-left text-ash transition hover:border-amber-300/60 hover:text-iron"
              type="button"
              title={prompt}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-graphite/80 text-iron">
                <AdapterIcon name={icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] uppercase tracking-[0.2em] text-ash/70">
                  {label}
                </span>
                <span className="block truncate text-[11px] text-iron/80" title={prompt}>
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
