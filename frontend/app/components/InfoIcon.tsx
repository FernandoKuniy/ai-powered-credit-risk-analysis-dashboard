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
  const positionLockedRef = useRef(false);
  const lockedPositionRef = useRef<{ top: string; left: string } | null>(null);

  // Reset position lock when tooltip is hidden
  useEffect(() => {
    if (!isVisible) {
      positionLockedRef.current = false;
      lockedPositionRef.current = null;
    }
  }, [isVisible]);

  // Set position directly on DOM element - use refs to avoid closure issues
  useLayoutEffect(() => {
    if (!usePortal || !tooltipRef.current) return;

    const element = tooltipRef.current;
    
    if (isVisible && iconRef.current && !positionLockedRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const tooltipWidth = 320;
      const spacing = 8;
      const viewportPadding = 10;

      let top: number;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;

      if (position === "below") {
        top = rect.bottom + spacing;
      } else {
        top = rect.top - 100 - spacing;
      }

      if (left + tooltipWidth > window.innerWidth - viewportPadding) {
        left = window.innerWidth - tooltipWidth - viewportPadding;
      }
      if (left < viewportPadding) {
        left = viewportPadding;
      }

      if (position === "above" && top < viewportPadding) {
        top = rect.bottom + spacing;
      }

      // Directly set style on DOM element - no React state, no re-renders
      element.style.cssText = `
        position: fixed !important;
        top: ${top}px !important;
        left: ${left}px !important;
        z-index: 9999 !important;
        visibility: visible !important;
        transform: none !important;
        transition: opacity 0.2s ease-in-out !important;
      `;
      
      lockedPositionRef.current = { top: `${top}px`, left: `${left}px` };
      positionLockedRef.current = true;
    } else if (!isVisible && element) {
      element.style.visibility = "hidden";
    }
  }, [isVisible, usePortal, position]);

  // Close tooltip on scroll
  useEffect(() => {
    if (!usePortal || !isVisible) return;

    const handleScroll = () => {
      setIsVisible(false);
    };

    window.addEventListener("scroll", handleScroll, true);
    
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [usePortal, isVisible]);

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
      className={`px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg border border-white/10 w-80 ${
        !usePortal 
          ? `info-tooltip ${position === "below" ? "top-full mt-2 absolute left-1/2 transform -translate-x-1/2" : "bottom-full mb-2 absolute left-1/2 transform -translate-x-1/2"}`
          : "" // No animation class for portal tooltips - position set directly via DOM
      }`}
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
