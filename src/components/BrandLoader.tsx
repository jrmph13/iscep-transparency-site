import brandMark from '../assets/b1.png'

/**
 * Branded loading indicator — the ISCEP emblem with layered effects: a soft
 * ripple, a slow rotating halo, a steady glow, and a gentle floating drift on
 * the logo (no throb / heartbeat). `className` sets the box size (default
 * h-24 w-24); the logo scales with it.
 */
export function BrandLoader({ label, className }: { label?: string; className?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className={`relative grid place-items-center ${className || 'h-24 w-24'}`}>
        {/* single slow ripple */}
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/15 [animation-duration:2.8s]" />
        {/* steady inner glow (no pulse) */}
        <span className="absolute inset-[12%] rounded-full bg-brand-500/10" />
        {/* slow rotating halo */}
        <span className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border border-brand-500/20 border-t-brand-500/70" />
        <img
          src={brandMark}
          alt="ISCEP"
          className="relative h-4/5 w-4/5 animate-[floaty_3.5s_ease-in-out_infinite] object-contain drop-shadow-md"
        />
      </div>
      {label && <p className="text-sm text-faint">{label}</p>}
    </div>
  )
}
