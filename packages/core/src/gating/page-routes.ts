const PAGE_ROUTES: Record<string, string> = {
  'p-staff-dashboard': '/staff/dashboard',
  'p-staff-tasks': '/staff/tasks',
  'p-lead-overview': '/leadership/dashboard',
  'p-lead-tasks': '/leadership/tasks',
  'p-lead-projects': '/leadership/projects',
  'p-lead-budget': '/leadership/budget',
  'p-lead-staff': '/leadership/staff',
  'p-lead-add-staff': '/leadership/staff',
  'p-lead-funders': '/leadership/funders',
  'p-lead-funds': '/leadership/funds',
  'p-donor-impact': '/donor/impact',
  'p-donor-funds': '/donor/funds',
  'p-donor-media': '/donor/media',
  'p-lead-media': '/leadership/media',
  'p-search': '/leadership/search',
  'p-appointments': '/appointments',
  'p-messages': '/messages',
};

const ROLE_HOME: Record<string, string> = {
  staff: '/staff/dashboard',
  leadership: '/leadership/dashboard',
  donor: '/donor/impact',
};

export function routeForPage(pageId: string, role: string): string {
  if (pageId === 'p-home') {
    return ROLE_HOME[role] ?? `/coming-soon?page=p-home`;
  }
  return PAGE_ROUTES[pageId] ?? `/coming-soon?page=${encodeURIComponent(pageId)}`;
}