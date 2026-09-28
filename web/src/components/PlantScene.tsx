import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function PlantScene() {
  const { isDark } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState({ x: 58, y: 46 });

  useEffect(() => {
    const host = rootRef.current?.parentElement;
    if (!host) return;
    const onMove = (e: MouseEvent) => {
      const r = host.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      setSpot({
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top) / r.height) * 100,
      });
    };
    host.addEventListener("mousemove", onMove, { passive: true });
    return () => host.removeEventListener("mousemove", onMove);
  }, []);

  const shiftX = (spot.x - 50) / 14;
  const shiftY = (spot.y - 50) / 18;

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="plant-bg-shift absolute inset-[-6%]"
        style={{ transform: `translate3d(${shiftX}%, ${shiftY}%, 0)` }}
      >
        <div
          className="plant-bg-photo absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('${isDark ? "/backgrounds/plant-dark.jpg" : "/backgrounds/plant-light.jpg"}')`,
          }}
        />
      </div>
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          isDark
            ? "bg-gradient-to-br from-black/42 via-[#061018]/24 to-black/16"
            : "bg-gradient-to-br from-[#eef4f8]/30 via-white/10 to-[#0b1a24]/16",
        )}
      />
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? `radial-gradient(560px circle at ${spot.x}% ${spot.y}%, rgba(61,205,88,0.18), transparent 58%)`
            : `radial-gradient(560px circle at ${spot.x}% ${spot.y}%, rgba(255,255,255,0.32), transparent 58%)`,
        }}
      />
      <div className="plant-scan absolute inset-0" />
    </div>
  );
}
