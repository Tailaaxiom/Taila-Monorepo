'use client';

import { useCurrentUser } from '../../context/current-user';

interface TopBarProps {
  title: string;
  onMenuClick: () => void;
}

export function TopBar({ title, onMenuClick }: TopBarProps) {
  const { employee } = useCurrentUser();
  const initials = employee.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header className="sticky top-0 z-50 bg-bg/[0.92] backdrop-blur-[14px] border-b border-border px-[1.5rem] py-[0.75rem] flex justify-between items-center">
      <div className="flex items-center gap-[0.7rem]">
        <button onClick={onMenuClick} className="w-7 h-7 bg-card border border-border2 items-center justify-center text-[0.95rem] hidden max-md:flex">
          ☰
        </button>
        <span className="text-[0.82rem] font-medium text-white">{title}</span>
      </div>
      <div className="flex items-center gap-[0.7rem]">
        <span className="text-[0.62rem] text-muted">{today}</span>
        <div className="w-[30px] h-[30px] rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-[0.6rem] font-bold text-gold">
          {initials}
        </div>
      </div>
    </header>
  );
}