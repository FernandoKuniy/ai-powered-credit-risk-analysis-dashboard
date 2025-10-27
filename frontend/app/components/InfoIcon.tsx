"use client";
import { useState } from "react";

interface InfoIconProps {
  explanation: string;
  className?: string;
}

export default function InfoIcon({ explanation, className = "" }: InfoIconProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-white/70 text-xs font-medium cursor-help hover:bg-white/30 transition-colors ${className}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        i
      </div>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg border border-white/10 z-50 w-80 info-tooltip">
          <div className="whitespace-normal">
            {explanation}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}
