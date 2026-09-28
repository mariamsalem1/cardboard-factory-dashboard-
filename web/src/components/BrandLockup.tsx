import { cn } from "@/lib/utils";

export function BrandLockup({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src="/logos/schneider.png"
        alt="Schneider Electric"
        className={cn(
          "w-auto object-contain object-left",
          compact ? "h-8 max-w-[128px]" : "h-10 max-w-[160px]",
        )}
      />
      <span className="h-7 w-px shrink-0 bg-white/30" aria-hidden />
      <img
        src="/logos/aveva.png"
        alt="AVEVA"
        className={cn(
          "w-auto object-contain object-left",
          compact ? "h-6 max-w-[110px]" : "h-8 max-w-[140px]",
        )}
      />
    </div>
  );
}
