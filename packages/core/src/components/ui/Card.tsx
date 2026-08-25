export function Card({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border p-[1.2rem]">
      {title && (
        <div className="mb-[0.85rem]">
          <div className="text-[0.72rem] font-medium text-white">{title}</div>
          {subtitle && <div className="text-[0.6rem] text-muted mt-[0.1rem]">{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}