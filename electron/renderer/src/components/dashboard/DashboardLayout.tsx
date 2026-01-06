import type { ReactNode } from 'react';

type DashboardLayoutProps = {
  header: ReactNode;
  children: ReactNode;
  scrollRef?: (node: HTMLDivElement | null) => void;
};

export const DashboardLayout = ({ header, children, scrollRef }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-ink text-iron">
      <div className="flex min-h-screen flex-col">
        <div className="px-6 pt-6">{header}</div>
        <main className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-4">
          <div
            ref={scrollRef}
            className="flex min-h-0 flex-1 items-stretch gap-5 overflow-x-auto pb-4"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
