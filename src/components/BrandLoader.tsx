import brandMark from '../assets/b1.png'

/**
 * Branded loading indicator — the ISCEP emblem with layered effects: a double
 * ripple, a slow rotating halo, and a gentle "breathe" scale on the logo.
 * `className` sets the box size (default h-24 w-24); the logo scales with it.
 */
export function BrandLoader({ label, className }: { label?: string; className?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className={`relative grid place-items-center ${className || 'h-24 w-24'}`}>
        {/* double ripple */}
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/20 [animation-duration:2s]" />
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/10 [animation-delay:1s] [animation-duration:2s]" />
        {/* steady inner glow */}
        <span className="absolute inset-[12%] animate-pulse rounded-full bg-brand-500/10" />
        {/* slow rotating halo */}
        <span className="absolute inset-0 animate-[spin_2.6s_linear_infinite] rounded-full border border-brand-500/20 border-t-brand-500/70" />
        <img
          src={brandMark}
          alt="ISCEP"
          className="relative h-4/5 w-4/5 animate-[breathe_2s_ease-in-out_infinite] object-contain drop-shadow-md"
        />
      </div>
      {label && <p className="text-sm text-faint">{label}</p>}
    </div>
  )
}
