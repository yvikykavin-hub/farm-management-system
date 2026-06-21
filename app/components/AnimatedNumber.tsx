"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({ value, prefix = "₹" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  const startTime = useRef<number | undefined>(undefined);
  const duration = 1000;

  useEffect(() => {
    startTime.current = undefined;
    let frame: number;
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * value));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span>
      {prefix}{display.toLocaleString("en-IN")}
    </span>
  );
}
