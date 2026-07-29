"use client";

import { useState, useRef } from "react";

interface Props {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  language?: string;
}

export default function PullToRefresh({ onRefresh, children, language = "en" }: Props) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const threshold = 70;

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!startY.current) return;
    const dist = e.touches[0].clientY - startY.current;
    if (dist > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(dist * 0.4, threshold));
    }
  };

  const onTouchEnd = async () => {
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
    startY.current = 0;
  };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center gap-2 text-green-600 py-2 transition-all duration-200"
          style={{
            height: isRefreshing ? "44px" : `${pullDistance}px`,
            opacity: isRefreshing ? 1 : pullDistance / threshold,
          }}
        >
          <span className={isRefreshing ? "animate-spin" : ""}>{pullDistance >= threshold ? "🔄" : "↓"}</span>
          <span className="text-sm font-medium">
            {isRefreshing
              ? language === "ta"
                ? "புதுப்பிக்கிறது..."
                : "Refreshing..."
              : pullDistance >= threshold
              ? language === "ta"
                ? "விடுங்கள்!"
                : "Release!"
              : language === "ta"
              ? "கீழே இழுக்கவும்"
              : "Pull to refresh"}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
