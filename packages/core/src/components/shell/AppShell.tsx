'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Sidebar } from './Sidebar';
// @ts-ignore
import { TopBar } from './TopBar'

const PageTitleContext = createContext<(title: string) => void>(() => {});

// A page calls this once to set the title shown in TopBar. Must run in an
// effect, not during render — useState's lazy initializer runs DURING
// render, which means it was calling AppShell's setTitle() while the page
// component was still rendering. React forbids one component updating
// another component's state mid-render; this is the fix for exactly that
// error ("Cannot update a component (AppShell) while rendering a different
// component"). See docs/LEARNINGS.md.
export function usePageTitle(title: string) {
  const setTitle = useContext(PageTitleContext);
  useEffect(() => {
    setTitle(title);
  }, [title, setTitle]);
}

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [title, setTitle] = useState('Home');

  return (
    <PageTitleContext.Provider value={setTitle}>
      <div className="min-h-screen">
        <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
        <div className="md:ml-[240px] min-h-screen">
          <TopBar title={title} onMenuClick={() => setSidebarOpen((v) => !v)} />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </PageTitleContext.Provider>
  );
}