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
    <span className="inline-flex items-center gap-2">
      <Image
        src="/grevya-icon.svg"
        alt="Grevya"
        width={icon}
        height={icon}
        priority
      />
      <span className={`font-bold tracking-tight ${text}`}>
        <span className={grevya}>Grevya</span>
        <span className={variant === "dark" ? "text-slate-400" : "text-slate-400"}>
          {" "}·{" "}
        </span>
        <span className={iq}>Interview IQ</span>
      </span>
    </span>
  );
}
