import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';

import { AdapterIcon, ModeIcon, TrashIcon } from './icons';
import type { AgentConfig } from './types';

type AgentCardProps = {
  id: string;
  agent: AgentConfig;
  adapterLabel: string;
  adapterIcon: string;
  onDelete: (id: string) => void;
};

export const AgentCard = ({ id, agent, adapterLabel, adapterIcon, onDelete }: AgentCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex w-[220px] flex-col gap-3 rounded-2xl border border-border/60 bg-ink/60 px-4 py-3 text-left text-ash shadow-[0_12px_28px_rgba(0,0,0,0.2)] transition ${
        isDragging ? 'cursor-grabbing opacity-80' : 'cursor-grab'
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 bg-graphite/80 text-iron">
            <AdapterIcon name={adapterIcon} className="h-4 w-4" />
          </span>
          <div className="text-[10px] uppercase tracking-[0.25em] text-ash/70">
            {agent.name?.trim() || adapterLabel}
          </div>
        </div>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete(id);
          }}
          className="rounded-full border border-border/60 bg-ink/60 p-1 text-ash/70 transition hover:border-rose-300/60 hover:text-rose-200"
          aria-label="Delete agent"
          type="button"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-[32px] text-xs text-iron/80">
        <span className="block truncate" title={agent.prompt}>
          {agent.prompt}
        </span>
      </div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-ash/60">
        <span className="flex items-center gap-2">
          <ModeIcon mode={agent.executionMode} className="h-3 w-3" />
          {agent.executionMode}
        </span>
      </div>
    </div>
  );
};
