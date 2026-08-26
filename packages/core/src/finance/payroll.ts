// Direct port of the legacy computePAYE() (index.html line 8281), not a
// re-derivation — see docs/LEARNINGS.md, "Payroll is fully built, not
// deferred": both handover documents wrongly called this unbuilt, but the
// Nigeria Tax Act schedule here was already audited in the legacy system.
// Keep the band widths, order, and rates exactly as documented there if
// this is ever touched.

export interface PayeInput {
  basicAnnual: number;
  housingAnnual: number;
  transportAnnual: number;
  otherAnnual: number;
  annualRent: number;
  nhfOptIn: boolean;
}

export interface PayeBand {
  width: number; // Infinity for the top, open-ended band
  rate: number;
  amount: number;
  tax: number;
}

export interface PayeResult {
  grossAnnual: number;
  pension: number;
  nhf: number;
  rentRelief: number;
  chargeableAnnual: number;
  bands: PayeBand[];
  totalTaxAnnual: number;
  totalTaxMonthly: number;
  netAnnual: number;
  netMonthly: number;
}

// Band WIDTHS, not thresholds — each band consumes min(remaining, width) of
// chargeable income, in order. Misreading these as cumulative thresholds is
// the documented way to get this wrong (see docs/LEARNINGS.md).
const PAYE_BANDS: { width: number; rate: number }[] = [
  { width: 800_000, rate: 0 },
  { width: 2_200_000, rate: 0.15 },
  { width: 9_000_000, rate: 0.18 },
  { width: 13_000_000, rate: 0.21 },
  { width: 25_000_000, rate: 0.23 },
  { width: Infinity, rate: 0.25 },
];

const PENSION_RATE = 0.08; // of (basic + housing + transport), annualised
const NHF_RATE = 0.025; // of basic, only when opted in
const RENT_RELIEF_RATE = 0.2; // of annual rent
const RENT_RELIEF_CAP = 500_000;

export function computePAYE(input: PayeInput): PayeResult {
  const grossAnnual = input.basicAnnual + input.housingAnnual + input.transportAnnual + input.otherAnnual;
  const pension = PENSION_RATE * (input.basicAnnual + input.housingAnnual + input.transportAnnual);
  const nhf = input.nhfOptIn ? NHF_RATE * input.basicAnnual : 0;
  const rentRelief = Math.min(RENT_RELIEF_RATE * input.annualRent, RENT_RELIEF_CAP);
  const chargeableAnnual = Math.max(0, grossAnnual - pension - nhf - rentRelief);

  let remaining = chargeableAnnual;
  let totalTaxAnnual = 0;
  const bands: PayeBand[] = [];

  for (const band of PAYE_BANDS) {
    if (remaining <= 0) break;
    const amount = Math.min(remaining, band.width);
    const tax = amount * band.rate;
    bands.push({ width: band.width, rate: band.rate, amount, tax });
    totalTaxAnnual += tax;
    remaining -= amount;
  }

  const netAnnual = grossAnnual - pension - nhf - totalTaxAnnual;

  return {
    grossAnnual,
    pension,
    nhf,
    rentRelief,
    chargeableAnnual,
    bands,
    totalTaxAnnual,
    totalTaxMonthly: totalTaxAnnual / 12,
    netAnnual,
    netMonthly: netAnnual / 12,
  };
}
