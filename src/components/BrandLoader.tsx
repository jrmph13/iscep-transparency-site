import brandMark from '../assets/b1.png'

/**
 * Branded loading indicator — the ISCEP emblem inside a smooth rotating ring,
 * with a soft static halo and a gentle float. No pulsing / throbbing.
 * `className` sets the box size (default h-24 w-24); the logo scales with it.
 */
export function BrandLoader({ label, className }: { label?: string; className?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className={`relative grid place-items-center ${className || 'h-24 w-24'}`}>
        {/* soft static halo */}
        <span className="absolute inset-[6%] rounded-full bg-brand-500/10 blur-md" />
        {/* faint full ring */}
        <span className="absolute inset-0 rounded-full border border-brand-500/15" />
        {/* smooth rotating highlight arc */}
        <span className="absolute inset-0 animate-[spin_2.4s_linear_infinite] rounded-full border-2 border-transparent border-t-brand-500/80" />
        <img
          src={brandMark}
          alt="ISCEP"
          className="relative h-3/4 w-3/4 animate-[floaty_4s_ease-in-out_infinite] object-contain drop-shadow-md"
        />
      </div>
      {label && <p className="text-sm text-faint">{label}</p>}
    </div>
  )
}
