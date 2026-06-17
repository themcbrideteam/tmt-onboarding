export default function BrandHeader({
  subtitle,
  maxWidth = "max-w-2xl",
  children,
}: {
  subtitle?: string;
  maxWidth?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="bg-navy">
      <div className={`mx-auto flex ${maxWidth} items-center justify-between px-4 py-3`}>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="The McBride Team" className="h-7 w-auto" />
          {subtitle && (
            <span className="border-l border-white/20 pl-3 text-xs text-gold-light">{subtitle}</span>
          )}
        </div>
        {children && <div className="flex items-center gap-4 text-xs text-white/80">{children}</div>}
      </div>
    </header>
  );
}
