import type { ReactNode } from 'react';

type MainLayoutProps = {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
};

export const MainLayout = ({ header, sidebar, children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-ink text-iron">
      <div className="flex min-h-screen flex-col">
        <div className="px-6 pt-6">{header}</div>
        <div className="flex min-h-0 flex-1 flex-col gap-6 px-6 pb-6 pt-4 lg:flex-row lg:items-stretch lg:gap-8">
          <aside className="w-full lg:w-72">
            <div className="h-full rounded-3xl border border-border bg-ink/40 p-4">
              {sidebar}
            </div>
          </aside>
          <main className="flex min-h-0 flex-1 flex-col rounded-3xl bg-graphite/50 p-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
