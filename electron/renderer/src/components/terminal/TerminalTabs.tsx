type TerminalTab = {
  id: string;
  label: string;
  isActive: boolean;
  needsAttention: boolean;
};

type TerminalTabsProps = {
  tabs: TerminalTab[];
  onSelect: (taskId: string) => void;
};

export const TerminalTabs = ({ tabs, onSelect }: TerminalTabsProps) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border/70 bg-ink/50 px-3 py-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
            tab.isActive
              ? 'border-accent/50 bg-ink/80 text-iron'
              : 'border-border/60 bg-ink/40 text-ash hover:border-iron/60 hover:text-iron'
          }`}
        >
          <span className="max-w-[160px] truncate" title={tab.label}>
            {tab.label}
          </span>
          {tab.needsAttention ? (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400/40 tab-pulse" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
};
