import brandMark from '../assets/b1.png'

/** Branded loading indicator — the ISCEP emblem with a soft pulsing glow. */
export function BrandLoader({ label, className }: { label?: string; className?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className={`relative grid place-items-center ${className || 'h-20 w-20'}`}>
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/20 [animation-duration:2s]" />
        <span className="absolute inset-1 animate-pulse rounded-full bg-brand-500/10" />
        <img
          src={brandMark}
          alt="ISCEP"
          className="relative h-32 w-32 animate-[breathe_2s_ease-in-out_infinite] object-contain drop-shadow-md"
        />
      </div>
      {label && <p className="text-sm text-faint">{label}</p>}
    </div>
  )
}
