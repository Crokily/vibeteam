type NotificationCenterProps = {
  count: number;
  onClick: () => void;
};

export const NotificationCenter = ({ count, onClick }: NotificationCenterProps) => {
  const hasNotifications = count > 0;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.3em] transition ${
        hasNotifications
          ? 'border-amber-400/50 text-amber-200 bg-amber-400/10'
          : 'border-border text-ash bg-ink/60 hover:border-iron hover:text-iron'
      }`}
      aria-label="Notifications"
    >
      <span>Alerts</span>
      <span
        className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full border px-2 text-[10px] font-semibold ${
          hasNotifications
            ? 'border-amber-300/40 bg-amber-400/10 text-amber-100'
            : 'border-border/60 text-ash'
        }`}
      >
        {count}
      </span>
    </button>
  );
};
