const PAGE_ROUTES: Record<string, string> = {
  'p-staff-dashboard': '/staff/dashboard',
  'p-staff-tasks': '/staff/tasks',
  'p-staff-requests': '/staff/requests',
  'p-staff-submit': '/staff/submit',
  'p-staff-summary': '/staff/summary',
  'p-staff-feed': '/staff/feed',
  'p-staff-media': '/staff/media',
  'p-staff-resources': '/staff/resources',
  'p-staff-projects': '/staff/projects',
  'p-lead-overview': '/leadership/dashboard',
  'p-lead-tasks': '/leadership/tasks',
  'p-lead-projects': '/leadership/projects',
  // p-pm-projects is a distinct nav id from p-lead-projects, but resolves
  // to the same page — same route-table shape as p-lead-staff/
  // p-lead-add-staff both pointing at /leadership/staff. No FEATURE_NAV
  // gate on either id, no separate ported business-logic module for "pm"
  // anywhere in packages/core (unlike p-mon-board, which has a real,
  // still-dormant packages/core/src/monitoring/aggregate.ts waiting for
  // it). Determined mechanically, not by re-reading the original handover
  // text — it isn't available in this session. See docs/EXECUTION.md.
  'p-pm-projects': '/leadership/projects',
  'p-lead-budget': '/leadership/budget',
  'p-lead-staff': '/leadership/staff',
  'p-lead-add-staff': '/leadership/staff',
  'p-lead-funders': '/leadership/funders',
  'p-lead-funds': '/leadership/funds',
  'p-lead-approvals': '/leadership/approvals',
  'p-lead-income': '/leadership/income',
  'p-lead-spend': '/leadership/spend',
  'p-lead-invoices': '/leadership/invoices',
  'p-lead-payroll': '/leadership/payroll',
  'p-lead-timeline': '/leadership/timeline',
  'p-lead-access': '/leadership/access',
  'p-lead-delivery': '/leadership/delivery',
  'p-lead-regional': '/leadership/regional',
  'p-lead-reports': '/leadership/reports',
  'p-lead-summaries': '/leadership/summaries',
  'p-donor-impact': '/donor/impact',
  'p-donor-funds': '/donor/funds',
  'p-donor-media': '/donor/media',
  'p-lead-media': '/leadership/media',
  'p-search': '/leadership/search',
  'p-appointments': '/appointments',
  'p-messages': '/messages',
  'p-compose': '/compose',
  'p-hod-dashboard': '/hod/dashboard',
  'p-hod-team': '/hod/team',
  'p-hod-tasks': '/hod/tasks',
  'p-hod-summaries': '/hod/summaries',
  'p-hod-submit': '/hod/submit',
  'p-hod-feed': '/hod/feed',
  'p-hod-access': '/hod/access',
  'p-hod-payroll': '/hod/payroll',
  'p-hod-projects': '/hod/projects',
  'p-hod-requests': '/hod/requests',
  'p-hod-media': '/hod/media',
  'p-hr-dashboard': '/hr/dashboard',
  'p-hr-reviews': '/hr/reviews',
};

const ROLE_HOME: Record<string, string> = {
  staff: '/staff/dashboard',
  leadership: '/leadership/dashboard',
  donor: '/donor/impact',
  // Previously missing, same gap already fixed once for donor (see
  // docs/EXECUTION.md, "Donor portal") — an hod account clicking Home fell
  // through to /coming-soon until the HOD workspace gave it somewhere real
  // to land. Same fix again here for hr, now that it has a real page too.
  // finance/admin still have no home page of their own; not fixed here
  // since neither gained one in this pass.
  hod: '/hod/dashboard',
  hr: '/hr/dashboard',
};

export function routeForPage(pageId: string, role: string): string {
  if (pageId === 'p-home') {
    return ROLE_HOME[role] ?? `/coming-soon?page=p-home`;
  }
  return PAGE_ROUTES[pageId] ?? `/coming-soon?page=${encodeURIComponent(pageId)}`;
}