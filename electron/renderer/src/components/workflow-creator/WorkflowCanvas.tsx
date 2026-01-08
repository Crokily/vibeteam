import type { ReactNode } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  SortableContext,
} from '@dnd-kit/sortable';

import { AgentCard } from './AgentCard';
import type { AgentConfig } from './types';

type AdapterMetaLookup = Record<string, { displayName: string; icon: string }>;

type WorkflowCanvasProps = {
  rows: string[][];
  agents: Record<string, AgentConfig>;
  adapterMeta: AdapterMetaLookup;
  onRowsChange: (rows: string[][]) => void;
  onRemoveAgent: (id: string) => void;
  onUpdateAgent: (id: string, updates: Partial<AgentConfig>) => void;
  onDuplicateAgent: (id: string) => void;
};

const rowId = (index: number) => `row-${index}`;
const addRowId = 'row-add';

const findRowIndex = (rows: string[][], id: string): number =>
  rows.findIndex((row) => row.includes(id));

const RowDropZone = ({
  id,
  children,
  isEmpty,
}: {
  id: string;
  children: ReactNode;
  isEmpty?: boolean;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border border-dashed px-3 py-3 transition ${
        isOver ? 'border-iron/60 bg-ink/70' : 'border-border/40 bg-ink/40'
      } ${isEmpty ? 'min-h-[120px]' : ''}`}
    >
      {children}
    </div>
  );
};

export const WorkflowCanvas = ({
  rows,
  agents,
  adapterMeta,
  onRowsChange,
  onRemoveAgent,
  onUpdateAgent,
  onDuplicateAgent,
}: WorkflowCanvasProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = ({
    active,
    over,
  }: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => {
    if (!over) {
      return;
    }

    const activeItemId = String(active.id);
    const overId = String(over.id);

    const sourceRowIndex = findRowIndex(rows, activeItemId);
    if (sourceRowIndex < 0) {
      return;
    }

    if (overId === addRowId) {
      const nextRows = rows.map((row) => row.filter((item) => item !== activeItemId));
      const cleaned = nextRows.filter((row) => row.length > 0);
      onRowsChange([...cleaned, [activeItemId]]);
      return;
    }

    let targetRowIndex = findRowIndex(rows, overId);
    let targetIndex = 0;

    if (targetRowIndex < 0 && overId.startsWith('row-')) {
      targetRowIndex = Number(overId.replace('row-', ''));
      targetIndex = rows[targetRowIndex]?.length ?? 0;
    } else if (targetRowIndex >= 0) {
      targetIndex = rows[targetRowIndex].indexOf(overId);
    }

    if (targetRowIndex < 0) {
      return;
    }

    const nextRows = rows.map((row) => [...row]);
    const sourceRow = nextRows[sourceRowIndex];
    const sourceIndex = sourceRow.indexOf(activeItemId);

    if (sourceIndex < 0) {
      return;
    }

    if (sourceRowIndex === targetRowIndex) {
      const nextRow = arrayMove(sourceRow, sourceIndex, targetIndex);
      nextRows[sourceRowIndex] = nextRow;
    } else {
      sourceRow.splice(sourceIndex, 1);
      const targetRow = nextRows[targetRowIndex];
      const insertionIndex = targetIndex < 0 ? targetRow.length : targetIndex;
      targetRow.splice(insertionIndex, 0, activeItemId);
    }

    onRowsChange(nextRows.filter((row) => row.length > 0));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {rows.length === 0 ? (
          <RowDropZone id={addRowId} isEmpty>
            <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.24em] text-ash/70">
              Drag agents here
            </div>
          </RowDropZone>
        ) : (
          <div className="flex flex-col gap-4">
            {rows.map((row, rowIndex) => (
              <RowDropZone key={rowId(rowIndex)} id={rowId(rowIndex)}>
                <SortableContext
                  items={row}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex flex-wrap gap-3">
                    {row.map((agentId) => {
                      const agent = agents[agentId];
                      if (!agent) {
                        return null;
                      }
                      const meta = adapterMeta[agent.adapter];
                      return (
                        <AgentCard
                          key={agentId}
                          id={agentId}
                          agent={agent}
                          adapterLabel={meta?.displayName ?? agent.adapter}
                          adapterIcon={meta?.icon ?? 'adapter'}
                          onDelete={onRemoveAgent}
                          onUpdate={onUpdateAgent}
                          onDuplicate={onDuplicateAgent}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </RowDropZone>
            ))}
            <RowDropZone id={addRowId}>
              <div className="flex items-center justify-center text-[10px] uppercase tracking-[0.24em] text-ash/70">
                New stage
              </div>
            </RowDropZone>
          </div>
        )}
      </DndContext>
    </div>
  );
};
