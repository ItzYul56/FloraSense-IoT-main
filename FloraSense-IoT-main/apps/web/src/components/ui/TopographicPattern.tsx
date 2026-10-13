import React from 'react';

export function TopographicPattern({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none opacity-[0.03] ${className}`}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="topo" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M0 100 Q 50 50 100 100 T 200 100 M0 150 Q 50 100 100 150 T 200 150 M0 50 Q 50 0 100 50 T 200 50" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M0 125 Q 50 75 100 125 T 200 125 M0 175 Q 50 125 100 175 T 200 175 M0 75 Q 50 25 100 75 T 200 75" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#topo)" />
      </svg>
    </div>
  );
}
