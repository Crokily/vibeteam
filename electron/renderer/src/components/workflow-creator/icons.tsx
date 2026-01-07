import type { ExecutionMode } from '../../../../shared/ipc-types';

type IconProps = {
  className?: string;
};

type AdapterIconProps = IconProps & {
  name: string;
};

export const AdapterIcon = ({ name, className }: AdapterIconProps) => {
  if (name === 'gemini') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M12 2l2.2 5.8L20 10l-5.8 2.2L12 18l-2.2-5.8L4 10l5.8-2.2L12 2z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
};

export const ModeIcon = ({ mode, className }: { mode: ExecutionMode } & IconProps) => {
  if (mode === 'headless') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="currentColor"
      >
        <path d="M6 4l14 8-14 8V4z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20c1.8-3.6 11.2-3.6 14 0" />
    </svg>
  );
};

export const TrashIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
  >
    <path d="M4 7h16" />
    <path d="M9 7V5h6v2" />
    <path d="M7 7l1 12h8l1-12" />
  </svg>
);

export const ChevronDownIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);
