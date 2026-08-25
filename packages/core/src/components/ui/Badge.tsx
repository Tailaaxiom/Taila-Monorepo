const VARIANTS: Record<string, string> = {
  green: 'bg-green/10 text-green',
  gold: 'bg-gold-light/10 text-gold-light',
  red: 'bg-red/10 text-red',
  blue: 'bg-blue/10 text-blue',
  muted: 'bg-muted/10 text-muted2',
};

export function Badge({ variant = 'muted', children }: { variant?: keyof typeof VARIANTS; children: React.ReactNode }) {
  return (
    <span className={`inline-block text-[0.54rem] tracking-[0.08em] px-[0.5rem] py-[0.16rem] rounded-[2px] font-medium uppercase ${VARIANTS[variant]}`}>
      {children}
    </span>
  );
}