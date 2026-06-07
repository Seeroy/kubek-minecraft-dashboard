"use client";

import { cn } from "@/shared/lib/cn";
import * as React from "react";

interface LoaderV2Props {
  loading?: boolean;
  color?: string;
  speedMultiplier?: number;
  className?: string;
  size?: number;
  margin?: number;
}

const LoaderV2: React.FC<LoaderV2Props> = ({
  loading = true,
  color = "currentColor",
  speedMultiplier = 1,
  className,
  size = 15,
  margin = 2,
  ...props
}) => {
  React.useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes react-spinners-rotate {
        0% { transform: rotate(0deg); }
        50% { transform: rotate(180deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const animationDuration = `${1 / speedMultiplier}s`;

  if (!loading) {
    return null;
  }

  return (
    <div
      className={cn("relative inline-block rounded-full", className)}
      style={{
        width: size,
        height: size,
        animation: `react-spinners-rotate ${animationDuration} infinite cubic-bezier(0.7, -0.13, 0.22, 0.86)`,
        backgroundColor: color,
      }}
      {...props}
    >
      <div
        className="absolute top-0 rounded-full opacity-80"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          transform: `translateX(${-1 * (26 + margin)}px)`,
        }}
      />
      <div
        className="absolute top-0 rounded-full opacity-80"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          transform: `translateX(${26 + margin}px)`,
        }}
      />
    </div>
  );
};

export default LoaderV2;
