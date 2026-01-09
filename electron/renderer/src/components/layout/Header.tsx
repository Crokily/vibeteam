import { NotificationCenter } from '../dashboard/NotificationCenter';
import { SessionList } from '../session/SessionList';

type HeaderProps = {
  activeCount: number;
  notificationCount: number;
  onNotificationClick: () => void;
  onNewWorkflow?: () => void;
};

export const Header = ({
  activeCount,
  notificationCount,
  onNotificationClick,
  onNewWorkflow,
}: HeaderProps) => {
  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-border bg-slate/70 px-6 py-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-xs uppercase tracking-[0.35em] text-ash">VibeTeam</div>
        {/* <SessionList /> */}
        <button
          onClick={onNewWorkflow}
          className="rounded-full border border-border bg-ink/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-ash transition hover:border-iron hover:text-iron"
        >
          New Workflow
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-ash">
        <span className="rounded-full border border-border/60 bg-ink/60 px-3 py-2 text-[10px]">
          Active {activeCount}
        </span>
        <NotificationCenter count={notificationCount} onClick={onNotificationClick} />
      </div>
    </header>
  );
};
