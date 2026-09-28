import { animate } from "motion/react";
import { useEffect, useState } from "react";

export function AnimatedNumber({
  value,
  duration = 0.7,
  decimals = 1,
}: {
  value: number;
  duration?: number;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration]);
  return <>{display.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}</>;
}
