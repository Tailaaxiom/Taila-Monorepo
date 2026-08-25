const TONES: Record<string, string> = {
  green: 'text-green',
  gold: 'text-gold-light',
  blue: 'text-blue',
  red: 'text-red',
  purple: 'text-purple',
};

const BAR_TONES: Record<string, string> = {
  green: 'bg-green',
  gold: 'bg-gold',
  blue: 'bg-blue',
  red: 'bg-red',
  purple: 'bg-purple',
};

interface StatTileProps {
  label: string;
  value: string | number;
  tone?: keyof typeof TONES;
}

export function StatTile({ label, value, tone = 'gold' }: StatTileProps) {
  return (
    <div className="bg-card border border-border p-4 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${BAR_TONES[tone]}`} />
      <div className="text-[0.54rem] tracking-[0.14em] uppercase text-muted mb-[0.4rem]">{label}</div>
      <div className={`font-display text-[1.9rem] font-light leading-none ${TONES[tone]}`}>{value}</div>
    </div>
  );
}