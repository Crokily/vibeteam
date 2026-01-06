type NewWorkflowColumnProps = {
  onClick?: () => void;
};

export const NewWorkflowColumn = ({ onClick }: NewWorkflowColumnProps) => {
  return (
    <button
      onClick={onClick}
      className="flex w-[240px] flex-none flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/50 bg-ink/30 px-6 py-10 text-left text-ash transition hover:border-iron hover:text-iron"
    >
      <div className="text-2xl font-semibold">+</div>
      <div className="text-xs uppercase tracking-[0.28em]">New Workflow</div>
    </button>
  );
};
