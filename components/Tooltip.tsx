/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactElement;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const showTooltip = () => {
    // A slight delay prevents tooltips from flashing while moving the mouse
    timeoutRef.current = window.setTimeout(() => {
        setIsVisible(true);
    }, 300);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  return (
    <div 
        className={`relative inline-flex items-center ${className}`}
        onMouseEnter={showTooltip} 
        onMouseLeave={hideTooltip}
    >
      {children}
      {isVisible && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-md shadow-lg whitespace-nowrap z-50 animate-fade-in"
          style={{ animationDuration: '150ms' }}
        >
          {text}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;