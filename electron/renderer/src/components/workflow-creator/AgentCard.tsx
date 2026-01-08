import { useEffect, useState } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';

import { AdapterIcon, CopyIcon, EditIcon, ModeIcon, TrashIcon } from './icons';
import type { AgentConfig } from './types';

type AgentCardProps = {
  id: string;
  agent: AgentConfig;
  adapterLabel: string;
  adapterIcon: string;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<AgentConfig>) => void;
  onDuplicate: (id: string) => void;
};

export const AgentCard = ({
  id,
  agent,
  adapterLabel,
  adapterIcon,
  onDelete,
  onUpdate,
  onDuplicate,
}: AgentCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const [isEditing, setIsEditing] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState(agent.prompt);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const promptTitle = agent.prompt?.trim() || 'No prompt';
  const dragAttributes = isEditing ? {} : attributes;
  const dragListeners = isEditing ? {} : listeners;

  useEffect(() => {
    if (!isEditing) {
      setDraftPrompt(agent.prompt);
    }
  }, [agent.prompt, isEditing]);

  const handleSave = () => {
    onUpdate(id, { prompt: draftPrompt });
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex w-[260px] flex-col gap-3 rounded-2xl border border-border/60 bg-ink/60 px-4 py-3 text-left text-ash shadow-[0_12px_28px_rgba(0,0,0,0.2)] transition ${
        isEditing ? 'cursor-default' : isDragging ? 'cursor-grabbing opacity-80' : 'cursor-grab'
      }`}
      title={promptTitle}
      {...dragAttributes}
      {...dragListeners}
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
        <div className="flex items-center gap-1">
          <button
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate(id);
            }}
            className="rounded-full border border-border/60 bg-ink/60 p-1 text-ash/70 transition hover:border-iron hover:text-iron"
            aria-label="Duplicate agent"
            type="button"
          >
            <CopyIcon className="h-4 w-4" />
          </button>
          <button
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setIsEditing(true);
            }}
            className="rounded-full border border-border/60 bg-ink/60 p-1 text-ash/70 transition hover:border-amber-300/70 hover:text-amber-100"
            aria-label="Edit prompt"
            type="button"
          >
            <EditIcon className="h-4 w-4" />
          </button>
          <button
            onPointerDown={(event) => event.stopPropagation()}
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
      </div>
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={draftPrompt}
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => setDraftPrompt(event.target.value)}
            rows={3}
            className="rounded-xl border border-border/60 bg-ink/70 px-3 py-2 text-xs text-iron outline-none transition focus:border-amber-300/70"
          />
          <div className="flex items-center justify-end gap-2 text-[10px] uppercase tracking-[0.2em]">
            <button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setDraftPrompt(agent.prompt);
                setIsEditing(false);
              }}
              className="rounded-full border border-border/60 bg-ink/70 px-2 py-1 text-ash/70 transition hover:border-iron hover:text-iron"
              type="button"
            >
              Cancel
            </button>
            <button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                handleSave();
              }}
              className="rounded-full border border-amber-300/70 bg-amber-400/10 px-2 py-1 text-amber-100 transition hover:border-amber-200 hover:text-amber-50"
              type="button"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-[32px] text-xs text-iron/80">
          <span className="block truncate">{promptTitle}</span>
        </div>
      )}
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-ash/60">
        <span className="flex items-center gap-2">
          <ModeIcon mode={agent.executionMode} className="h-3 w-3" />
          {agent.executionMode}
        </span>
      </div>
    </div>
  );
};
