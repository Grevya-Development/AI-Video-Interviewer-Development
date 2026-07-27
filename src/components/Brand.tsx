import Image from "next/image";

/**
 * Grevya · Interview IQ brand lockup.
 * `variant="dark"` renders light text for dark backgrounds (candidate room).
 */
export function Brand({
  variant = "light",
  size = "md",
}: {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}) {
  const icon = size === "sm" ? 22 : size === "lg" ? 34 : 28;
  const text =
    size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";
  const grevya = variant === "dark" ? "text-white" : "text-slate-900";
  const iq = "text-[#02a4ef]";

  return (
    <span className="inline-flex items-center gap-1 sm:gap-2">
      <Image
        src="/grevya-icon.svg"
        alt="Grevya"
        width={icon}
        height={icon}
        priority
      />
      <span className={`font-bold tracking-tight ${text}`}>
        <span className={grevya}>Grevya</span>
        <span className="hidden sm:inline text-slate-400"> · </span>
        <span className={`hidden sm:inline ${iq}`}>Interview IQ</span>
        <span className={`sm:hidden ${iq}`}> IQ</span>
      </span>
    </span>
  );
}
