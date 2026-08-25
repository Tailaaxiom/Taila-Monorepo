// src/lib/gating/grantable-features.ts
export const GRANTABLE_FEATURES: { id: string; l: string }[] = [
  {id:'p-lead-funds',l:'Fund Management'},{id:'p-lead-funders',l:'Funders'},{id:'p-lead-analytics',l:'Impact and Reach'},
  {id:'p-lead-payroll',l:'Payroll'},{id:'p-lead-projects',l:'Project Monitor'},{id:'p-lead-approvals',l:'Approvals'},
  {id:'p-lead-command',l:'Live Command Map'},{id:'p-lead-margins',l:'Project Margins'},{id:'p-lead-reports',l:'Reports & Charts'},
  {id:'p-lead-media',l:'Media Library'},{id:'p-lead-story',l:'Storytelling Engine'},{id:'p-hr-reviews',l:'Performance Reviews'},{id:'p-lead-inventory',l:'Inventory'},
  {id:'p-mf-floor',l:'The floor'},{id:'p-mf-new',l:'New production order'},{id:'p-mf-runs',l:'Production runs'},{id:'p-mf-prod',l:'Products and materials'},{id:'p-mf-sales',l:'Customer orders'},{id:'p-mf-buy',l:'Purchase orders'},{id:'p-mf-recv',l:'Goods receiving'},{id:'p-mf-stock',l:'Finished stock'},{id:'p-mf-reorder',l:'What to buy'},{id:'p-mf-sched',l:'The schedule'},{id:'p-mf-cap',l:'Capacity'},{id:'p-mf-mach',l:'Machines'},{id:'p-mf-shifts',l:'Shifts and operators'},{id:'p-mf-scrap',l:'Where scrap comes from'},{id:'p-mf-yield',l:'Yield over time'},{id:'p-mf-shelf',l:'Shelf life'},{id:'p-mf-sup',l:'Suppliers'},{id:'p-mf-trace',l:'Trace a batch'},{id:'p-mf-recall',l:'Recall trace'},{id:'p-mf-scan',l:'Scan a batch'},{id:'p-mf-safety',l:'Safety'},{id:'p-mf-locations',l:'Where stock is'},{id:'p-sm-who',l:'Who is working'},{id:'p-sm-posts',l:'Posts'},{id:'p-sm-setup',l:'Project setup'},{id:'p-sm-roster',l:'The team'},{id:'p-re-props',l:'Properties'},{id:'p-re-pipe',l:'Pipeline'},{id:'p-re-arrears',l:'Arrears'},{id:'p-re-leases',l:'Leases and rent'},{id:'p-re-agents',l:'Agents'},{id:'p-re-maint',l:'Maintenance'},
];
// Note: hospitality-kit pages (p-hos-*) aren't in this list, so they can't
// be individually granted the way manufacturing/social/real-estate pages
// can. Worth a call on whether that's intentional before Phase 2's
// Hospitality workspace — flag it to your co-dev, not urgent for Phase 1.