// src/components/ConnectionLine.tsx

import React from 'react';

interface ConnectionLineProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  condition: string;
  isTemporary?: boolean;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({ from, to, isTemporary }) => {
  const path = `M ${from.x} ${from.y} C ${from.x + 50} ${from.y} ${to.x - 50} ${to.y} ${to.x} ${to.y}`;

  return (
    <g>
      <path
        d={path}
        stroke={isTemporary ? "#A78BFA" : "#8B5CF6"}
        strokeWidth="2"
        fill="none"
        markerEnd="url(#arrowhead)"
        strokeDasharray={isTemporary ? "8 4" : "none"}
        className={isTemporary ? "animate-pulse" : ""}
      />
    </g>
  );
};