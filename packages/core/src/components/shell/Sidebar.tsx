'use client';

import { usePathname, useRouter } from 'next/navigation';
import { getNavItems } from '../../gating/resolver';
import { useCurrentUser } from '../../context/current-user';
import { routeForPage } from '../../gating/page-routes';

const ROLE_STYLES: Record<string, string> = {
  staff: 'bg-green/10 text-green',
  leadership: 'bg-gold/10 text-gold-light',
  donor: 'bg-blue/10 text-blue',
  admin: 'bg-purple/10 text-purple',
  hod: 'bg-orange/10 text-orange',
  finance: 'bg-green/10 text-green',
  hr: 'bg-orange/10 text-orange',
};

interface SidebarProps {
  open: boolean;
  onNavigate: () => void; // just closes the mobile drawer now
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const { org, employee } = useCurrentUser();
  const items = getNavItems(employee.role, org, employee);
  const roleClass = ROLE_STYLES[employee.role] ?? 'bg-muted/10 text-muted2';
  const pathname = usePathname();
  const router = useRouter();

  const go = (pageId: string) => {
  router.push(routeForPage(pageId, employee.role));
  onNavigate();
};

const isActive = (pageId: string) => pathname === routeForPage(pageId, employee.role);

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 w-[240px] bg-panel border-r border-border flex flex-col z-[100] transition-transform duration-300 ${
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      <div className="px-[1.1rem] py-[1.2rem] border-b border-border">
        <div className="flex items-center gap-0 leading-none">
          <span className="font-wordmark text-[1.5rem] tracking-[0.1em] text-white">TAILA</span>
          <span className="w-[2px] h-[1.2rem] bg-gold mx-[0.45rem] inline-block shrink-0" />
          <span className="font-wordmark text-[1.5rem] tracking-[0.1em] text-gold">AXIOM</span>
        </div>
        <div className="text-[0.58rem] text-muted mt-[0.3rem] truncate">{org.name}</div>
      </div>

      <div className={`mx-[1.1rem] mt-[0.65rem] px-[0.65rem] py-[0.32rem] text-[0.54rem] tracking-[0.14em] uppercase font-semibold text-center ${roleClass}`}>
        {employee.role}
      </div>

      <div className="px-[1.1rem] pb-[0.6rem] pt-[0.5rem] border-b border-border">
        <div className="text-[0.72rem] font-medium text-white">{employee.full_name}</div>
        <div className="text-[0.58rem] text-muted mt-[0.1rem]">{employee.department ?? employee.job_title}</div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto py-[0.4rem]">
        <button
          onClick={() => go('p-home')}
          className={`flex items-center gap-[0.7rem] w-full text-left px-[1.1rem] py-[0.62rem] text-[0.75rem] border-l-2 transition-colors ${
            isActive('p-home') ? 'text-white border-gold bg-gold/[0.07]' : 'text-muted2 border-transparent hover:text-white hover:bg-white/[0.025]'
          }`}
        >
          <span className={`w-4 text-center ${isActive('p-home') ? 'text-gold' : 'text-muted'}`}>⌂</span>
          Home
        </button>

        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => go(item.id)}
            className={`flex items-center gap-[0.7rem] w-full text-left px-[1.1rem] py-[0.62rem] text-[0.75rem] border-l-2 transition-colors ${
              isActive(item.id) ? 'text-white border-gold bg-gold/[0.07]' : 'text-muted2 border-transparent hover:text-white hover:bg-white/[0.025]'
            }`}
          >
            <span className={`w-4 text-center ${isActive(item.id) ? 'text-gold' : 'text-muted'}`}>{item.i}</span>
            {item.l}
          </button>
        ))}
      </nav>

      <div className="px-[1.1rem] py-[0.85rem] border-t border-border">
        <button className="w-full py-[0.48rem] bg-transparent border border-border2 text-muted text-[0.6rem] tracking-[0.1em] uppercase hover:border-red hover:text-red transition-colors">
          Log out
        </button>
      </div>
    </aside>
  );
}