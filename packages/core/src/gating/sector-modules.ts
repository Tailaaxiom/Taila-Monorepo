// src/lib/gating/sector-modules.ts
// Folded together: the original const (lines 2416-2430) + the manufacturing
// patch (line 21165, since SECTOR_MODULES.project is dead — orgModuleSet's
// hardcoded project override always wins, see resolver.ts) + the media patch
// (line 26760, media gets 'social' concatenated on).
export const SECTOR_MODULES: Record<string, string[]> = {
  logistics:    ['payroll','multicurrency','livemap','offline','clientportal','margins','logistics','inventory','orgsuite'],
  ngo:          ['payroll','funders','multicurrency','livemap','offline','story','orgsuite'],
  health:       ['payroll','funders','livemap','offline','story','inventory','orgsuite'],
  realestate:   ['payroll','multicurrency','livemap','offline','clientportal','margins','inventory','property','orgsuite'],
  finance:      ['payroll','multicurrency','clientportal','margins','orgsuite'],
  corporate:    ['payroll','multicurrency','clientportal','margins','inventory','orgsuite'],
  humanitarian: ['payroll','funders','multicurrency','livemap','offline','story','logistics','inventory','orgsuite'],
  education:    ['payroll','funders','story','orgsuite'],
  media:        ['payroll','multicurrency','clientportal','margins','inventory','orgsuite','social'],
  oilgas:       ['payroll','multicurrency','livemap','offline','clientportal','margins','inventory','orgsuite'],
  law:          ['payroll','clientportal','margins'],
  hospitality:  ['hospitality','payroll','multicurrency','clientportal','margins','inventory','orgsuite'],
  manufacturing:['inventory','payroll','margins','multicurrency','clientportal','logistics','offline','livemap','production'],
};