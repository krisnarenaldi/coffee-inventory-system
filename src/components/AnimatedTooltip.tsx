"use client";

import { useState, useRef, useEffect } from "react";

interface AnimatedTooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export default function AnimatedTooltip({
  content,
  children,
  position = "top",
}: AnimatedTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
      let y = triggerRect.top - tooltipRect.height - 8;
      
      // Adjust if tooltip goes off screen
      if (x < 8) x = 8;
      if (x + tooltipRect.width > window.innerWidth - 8) {
        x = window.innerWidth - tooltipRect.width - 8;
      }
      if (y < 8) {
        y = triggerRect.bottom + 8;
      }
      
      setTooltipPosition({ x, y });
    }
  }, [isVisible]);

  const positionClasses = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800",
    bottom: "bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800",
    left: "left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-800",
    right: "right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-800",
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      
      {/* Tooltip Portal */}
       {isVisible && (
         <div
           ref={tooltipRef}
           className={`
             fixed z-[9999] px-3 py-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg
             transition-all duration-300 ease-in-out whitespace-nowrap pointer-events-none
             ${
               isVisible
                 ? "opacity-100 visible transform scale-100"
                 : "opacity-0 invisible transform scale-95"
             }
           `}
           style={{
             left: tooltipPosition.x,
             top: tooltipPosition.y,
             animation: isVisible ? "tooltipFadeIn 0.3s ease-out" : "tooltipFadeOut 0.3s ease-in",
           }}
         >
           {content}
         </div>
       )}
       
       {/* CSS Animations */}
       <style jsx>{`
        @keyframes tooltipFadeIn {
          0% {
            opacity: 0;
            transform: scale(0.95) translateY(5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes tooltipFadeOut {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          100% {
            opacity: 0;
            transform: scale(0.95) translateY(5px);
          }
        }
      `}</style>
    </>
  );
}