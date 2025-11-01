"use client";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

interface InfoIconProps {
  explanation: string;
  className?: string;
  position?: "above" | "below";
  usePortal?: boolean; // New prop to enable portal rendering
}

export default function InfoIcon({ explanation, className = "", position = "above", usePortal = false }: InfoIconProps) {
  const [isVisible, setIsVisible] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    position: "fixed",
    zIndex: 9999,
    visibility: "hidden",
  });

  // Calculate tooltip position for portal mode
  const calculateTooltipPosition = () => {
    if (!iconRef.current) return;

    const rect = iconRef.current.getBoundingClientRect();
    const tooltipWidth = 320; // w-80 = 20rem = 320px
    const spacing = 8; // mb-2 = 0.5rem = 8px

    let top: number;
    const left = rect.left + rect.width / 2 - tooltipWidth / 2;

    if (position === "below") {
      top = rect.bottom + spacing;
    } else {
      // Position above - estimate tooltip height as ~100px
      top = rect.top - 100 - spacing;
    }

    // Keep tooltip within viewport horizontally
    const clampedLeft = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));

    // If positioning above would go off-screen, position below instead
    if (position === "above" && top < 10) {
      top = rect.bottom + spacing;
    }

    return {
      position: "fixed" as const,
      top: `${top}px`,
      left: `${clampedLeft}px`,
      zIndex: 9999,
      visibility: "visible" as const,
    };
  };

  // Update tooltip position when visible (portal mode only)
  useLayoutEffect(() => {
    if (!usePortal || !isVisible || !iconRef.current) {
      if (!isVisible) {
        setTooltipStyle({
          position: "fixed",
          zIndex: 9999,
          visibility: "hidden",
        });
      }
      return;
    }

    const style = calculateTooltipPosition();
    if (style) {
      setTooltipStyle(style);
    }
  }, [isVisible, usePortal, position]);

  // Update position on scroll and resize (portal mode only)
  useEffect(() => {
    if (!usePortal || !isVisible) return;

    const updatePosition = () => {
      if (iconRef.current) {
        const style = calculateTooltipPosition();
        if (style) {
          setTooltipStyle(style);
        }
      }
    };

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [usePortal, isVisible, position]);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        (iconRef.current && iconRef.current.contains(event.target as Node)) ||
        (tooltipRef.current && tooltipRef.current.contains(event.target as Node))
      ) {
        return;
      }
      setIsVisible(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isVisible]);

  // Render tooltip content
  const tooltipContent = isVisible ? (
    <div
      ref={tooltipRef}
      className={`px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg border border-white/10 w-80 info-tooltip ${
        !usePortal && (position === "below" ? "top-full mt-2 absolute left-1/2 transform -translate-x-1/2" : "bottom-full mb-2 absolute left-1/2 transform -translate-x-1/2")
      }`}
      style={usePortal ? tooltipStyle : undefined}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div className="whitespace-normal">
        {explanation}
      </div>
      {/* Tooltip arrow */}
      {position === "below" ? (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
      ) : (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      )}
    </div>
  ) : null;

  return (
    <>
      <div className="relative inline-block" ref={iconRef}>
        <div
          className={`inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-white/70 text-xs font-medium cursor-help hover:bg-white/30 transition-colors ${className}`}
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(true);
          }}
        >
          i
        </div>
        {!usePortal && tooltipContent}
      </div>
      {usePortal && typeof window !== "undefined" && createPortal(tooltipContent, document.body)}
    </>
  );
}
