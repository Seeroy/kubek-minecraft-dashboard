import LogoV2 from "@/shared/ui/logo-v2";

// Standalone hero canvas for capturing a promo image:
// black backdrop, fading grid, centered logo with glow + shadow
export default function PromoPage() {
  return (
    <main
      className="relative grid h-dvh w-full place-items-center overflow-hidden bg-black text-primary"
      style={{ ["--primary" as string]: "oklch(0.68 0.185 265)" }}
    >
      {/* Grid that softly fades out toward the screen edges (never fully) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.10) 1px, transparent 1px)",
          backgroundSize: "86px 86px",
          backgroundPosition: "center",
          WebkitMaskImage:
            "radial-gradient(120% 120% at 50% 50%, #000 30%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.12) 100%)",
          maskImage:
            "radial-gradient(120% 120% at 50% 50%, #000 30%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.12) 100%)",
        }}
      />

      {/* Soft colored glow pooling behind the logo */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(closest-side, rgba(99,102,241,0.28), rgba(99,102,241,0.10) 55%, transparent 80%)",
          filter: "blur(20px)",
        }}
      />

      {/* The logo itself, lifted off the canvas with glow + drop shadow */}
      <div
        className="relative z-10"
        style={{
          filter:
            "drop-shadow(0 0 28px rgba(99,102,241,0.55)) drop-shadow(0 18px 40px rgba(0,0,0,0.75))",
        }}
      >
        <LogoV2 size="xl" className="scale-200" />
      </div>
    </main>
  );
}
