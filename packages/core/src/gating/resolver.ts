// src/lib/gating/resolver.ts
import { SECTOR_MODULES } from './sector-modules';
import { NAVMAP } from './navmap';
import { FEATURE_NAV } from './feature-nav';
import type { Organization } from '../types/organization';
import type { Employee } from '../types/employee';

// Clean, single-pass version — combines the intent of the two later
// wrappers with the original base matcher, specific-before-generic.
export function getSectorKey(sectorStr: string | null): string {
  if (!sectorStr) return 'ngo';
  const s = sectorStr.toLowerCase();

  if (s === 'project' || /^project\b/.test(s)) return 'project';
  if (/media|advertis|publish|broadcast|film|creative|communications|photograph/.test(s)) return 'media';
  if (/manufactur|factory|fabricat|foundry|refinery|bottling|brewery|milling|processing plant|assembly plant|packaging|fmcg|cement plant|steel|plastics/.test(s)) return 'manufacturing';

  if (s.includes('real estate') || s.includes('realestate') || s.includes('realty')) return 'realestate';
  if (s.includes('oil') || s.includes('gas') || s.includes('petroleum') || s.includes('upstream') || s.includes('downstream') || s.includes('energy')) return 'oilgas';
  if (s.includes('law') || s.includes('legal') || s.includes('chambers') || s.includes('attorney') || s.includes('solicitor') || s.includes('advocate')) return 'law';
  if (s.includes('humanitarian') || s.includes('relief')) return 'humanitarian';
  if (s.includes('logistics') || s.includes('haulage') || s.includes('freight') || s.includes('forwarding') || s.includes('shipping') || s.includes('cargo') || s.includes('clearing') || s.includes('removals') || s.includes('supply chain') || s.includes('transport')) return 'logistics';
  if (s.includes('health ngo') || s.includes('development') || s.includes('advocacy') || s.includes('research institution')) return 'ngo';
  if (s.includes('hospitality') || s.includes('hotel') || s.includes('restaurant') || s.includes('concierge') || s.includes('lodging') || s.includes('resort')) return 'hospitality';
  if (s.includes('hospital') || s.includes('healthcare') || s.includes('pharma')) return 'health';
  if (s.includes('corporate') || s.includes('consulting') || s.includes('commerce') || s.includes('technology') || s.includes('engineering') || s.includes('retail')) return 'corporate';
  if (s.includes('property') || s.includes('realty')) return 'realestate';
  if (s.includes('education') || s.includes('training')) return 'education';
  if (s.includes('finance') || s.includes('investment') || s.includes('development finance')) return 'finance';
  return 'ngo';
}

const PROJECT_CLIENT_MODULES = ['social', 'offline', 'margins', 'multicurrency', 'livemap'];

export function orgModuleSet(org: Organization | null): string[] | null {
  if (!org) return null;

  if ((org.acct_type ?? 'org') === 'project') {
    return PROJECT_CLIENT_MODULES;
  }

  let out: string[] | null = null;
  const saved = org.modules; // already parsed to string[] | null by parseOrganization
  if (Array.isArray(saved) && saved.length) {
    out = saved.map((x) => String(x).trim());
  }

  const k = getSectorKey(org.sector);
  if (!out) out = (SECTOR_MODULES[k] || SECTOR_MODULES['corporate'] || []).slice();
  else out = out.slice();

  if (k === 'manufacturing' && !out.includes('production')) out.push('production');
  if (k === 'realestate' && !out.includes('property')) out.push('property');
  if (k === 'hospitality' && !out.includes('hospitality')) out.push('hospitality');
  if (!out.includes('orgsuite')) out.push('orgsuite');

  return out;
}

const PROJECT_HIDE = [
  'p-lead-tasks','p-staff-tasks','p-hod-tasks','p-lead-targets','p-lead-projects',
  'p-staff-projects','p-hod-projects','p-lead-command','p-lead-media','p-staff-media',
  'p-hod-media','p-lead-settings',
];

export function navItemAllowed(pageId: string, org: Organization | null, emp: Employee | null): boolean {
  if (org?.acct_type === 'project' && PROJECT_HIDE.includes(pageId)) {
    if (!emp?.extraPages?.includes(pageId)) return false;
  }

  const mod = FEATURE_NAV[pageId];
  if (!mod) return true;

  const set = orgModuleSet(org);
  if (!set) return true;

  if (pageId === 'p-lead-command' && set.includes('logistics')) return true;
  return set.includes(mod);
}

const navLookup: Record<string, { id: string; l: string; i: string }> = {};
Object.values(NAVMAP).forEach((entries) => {
  entries.forEach((n) => { if (!navLookup[n.id]) navLookup[n.id] = n; });
});

export function getNavItems(role: string, org: Organization | null, emp: Employee | null) {
  let items = (NAVMAP[role] || []).slice();

  (emp?.extraRoles ?? []).forEach((r) => {
    (NAVMAP[r] || []).forEach((n) => {
      if (!items.some((x) => x.id === n.id)) items.push(n);
    });
  });

  (emp?.extraPages ?? []).forEach((pgid) => {
    const entry = navLookup[pgid];
    if (entry && !items.some((x) => x.id === pgid)) items.push(entry);
  });

  return items.filter((n) => navItemAllowed(n.id, org, emp));
}