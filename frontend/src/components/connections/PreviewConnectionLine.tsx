import React from "react";

interface PreviewConnectionLineProps {
  sourcePoint: { x: number; y: number };
  targetPoint: { x: number; y: number };
  zoom: number;
  color?: string;
}

export function PreviewConnectionLine({
  sourcePoint,
  targetPoint,
  zoom,
  color = "#D1D5DB",
}: PreviewConnectionLineProps) {
  // Create curved path
  const midX = (sourcePoint.x + targetPoint.x) / 2;
  const path = `
    M ${sourcePoint.x} ${sourcePoint.y}
    C ${midX} ${sourcePoint.y},
      ${midX} ${targetPoint.y},
      ${targetPoint.x} ${targetPoint.y}
  `;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Preview connection line - light gray, dashed, animated */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5 / zoom}
        strokeLinecap="round"
        strokeDasharray={`${5 / zoom},${5 / zoom}`}
        opacity={0.6}
        style={{
          pointerEvents: 'none',
          animation: 'dash-flow 0.5s linear infinite'
        }}
      />
    </g>
  );
}
