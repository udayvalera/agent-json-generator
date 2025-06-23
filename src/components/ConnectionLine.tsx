import React from 'react';

interface ConnectionLineProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  condition: string;
  isTemporary?: boolean;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({ from, to, condition, isTemporary }) => {
  // Path for the curved line
  const path = `M ${from.x} ${from.y} C ${from.x + 60} ${from.y} ${to.x - 60} ${to.y} ${to.x} ${to.y}`;

  // Calculate the position for the label (midpoint of the curve)
  const labelX = (from.x + to.x) / 2;
  const labelY = (from.y + to.y) / 2;

  // Unique ID for the path to be referenced by the textPath
  const pathId = `path_${from.x}_${from.y}_${to.x}_${to.y}`;

  return (
    <g>
      {/* Invisible path for the text to follow */}
      <path id={pathId} d={path} fill="none" />

      {/* Visible styled path */}
      <path
        d={path}
        stroke={isTemporary ? "#A78BFA" : "#8B5CF6"}
        strokeWidth="2.5"
        fill="none"
        markerEnd="url(#arrowhead)"
        strokeDasharray={isTemporary ? "8 4" : "none"}
        className={isTemporary ? "animate-pulse" : ""}
        style={{ filter: 'drop-shadow(0 1px 1px rgb(0 0 0 / 0.1))' }}
      />

      {/* Text label that follows the curve */}
      {!isTemporary && condition && (
        <text dy="-6" textAnchor="middle" className="text-xs font-medium" fill="#6D28D9">
          <textPath href={`#${pathId}`} startOffset="50%">
            {condition}
          </textPath>
        </text>
      )}
    </g>
  );
};
