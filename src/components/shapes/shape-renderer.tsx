'use client'

import { useTheme } from 'next-themes'
import { ShapeType } from '@/interfaces/flowchart'

interface ShapeRendererProps {
  type: ShapeType
  width: number
  height: number
  selected?: boolean
  color?: string
}

export function ShapeRenderer({ type, width, height, selected, color }: ShapeRendererProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const fillColor = color || (isDark ? '#334155' : '#ffffff')
  const strokeColor = selected
    ? (isDark ? '#818cf8' : '#6366f1')
    : (isDark ? '#64748b' : '#94a3b8')
  const strokeWidth = selected ? 2.5 : 1.5

  const renderShape = () => {
    switch (type) {
      case 'start-end':
        return (
          <rect
            x={strokeWidth}
            y={strokeWidth}
            width={width - strokeWidth * 2}
            height={height - strokeWidth * 2}
            rx={(height - strokeWidth * 2) / 2}
            ry={(height - strokeWidth * 2) / 2}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        )

      case 'process':
        return (
          <rect
            x={strokeWidth}
            y={strokeWidth}
            width={width - strokeWidth * 2}
            height={height - strokeWidth * 2}
            rx={8}
            ry={8}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        )

      case 'decision':
        const cx = width / 2
        const cy = height / 2
        const dx = width / 2 - strokeWidth
        const dy = height / 2 - strokeWidth
        return (
          <polygon
            points={`${cx},${strokeWidth} ${width - strokeWidth},${cy} ${cx},${height - strokeWidth} ${strokeWidth},${cy}`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )

      case 'data':
        const skew = 20
        return (
          <polygon
            points={`${skew + strokeWidth},${strokeWidth} ${width - strokeWidth},${strokeWidth} ${width - skew - strokeWidth},${height - strokeWidth} ${strokeWidth},${height - strokeWidth}`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )

      case 'document':
        const waveHeight = 15
        return (
          <path
            d={`M ${strokeWidth} ${strokeWidth}
                L ${width - strokeWidth} ${strokeWidth}
                L ${width - strokeWidth} ${height - waveHeight - strokeWidth}
                Q ${width * 0.75} ${height - strokeWidth}, ${width / 2} ${height - waveHeight - strokeWidth}
                Q ${width * 0.25} ${height - waveHeight * 2 - strokeWidth}, ${strokeWidth} ${height - waveHeight - strokeWidth}
                Z`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )

      case 'predefined-process':
        const sideMargin = 15
        return (
          <>
            <rect
              x={strokeWidth}
              y={strokeWidth}
              width={width - strokeWidth * 2}
              height={height - strokeWidth * 2}
              rx={4}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <line
              x1={sideMargin}
              y1={strokeWidth}
              x2={sideMargin}
              y2={height - strokeWidth}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <line
              x1={width - sideMargin}
              y1={strokeWidth}
              x2={width - sideMargin}
              y2={height - strokeWidth}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </>
        )

      case 'connector':
        return (
          <circle
            cx={width / 2}
            cy={height / 2}
            r={Math.min(width, height) / 2 - strokeWidth}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        )

      case 'delay':
        return (
          <path
            d={`M ${strokeWidth} ${strokeWidth}
                L ${width * 0.7} ${strokeWidth}
                Q ${width - strokeWidth} ${strokeWidth}, ${width - strokeWidth} ${height / 2}
                Q ${width - strokeWidth} ${height - strokeWidth}, ${width * 0.7} ${height - strokeWidth}
                L ${strokeWidth} ${height - strokeWidth}
                Z`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )

      case 'manual-input':
        const topSlant = 20
        return (
          <polygon
            points={`${strokeWidth},${topSlant + strokeWidth} ${width - strokeWidth},${strokeWidth} ${width - strokeWidth},${height - strokeWidth} ${strokeWidth},${height - strokeWidth}`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )

      case 'preparation':
        const hexOffset = 25
        return (
          <polygon
            points={`${hexOffset},${strokeWidth} ${width - hexOffset},${strokeWidth} ${width - strokeWidth},${height / 2} ${width - hexOffset},${height - strokeWidth} ${hexOffset},${height - strokeWidth} ${strokeWidth},${height / 2}`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )

      case 'database':
        const ellipseHeight = 15
        return (
          <>
            <path
              d={`M ${strokeWidth} ${ellipseHeight + strokeWidth}
                  L ${strokeWidth} ${height - ellipseHeight - strokeWidth}
                  Q ${strokeWidth} ${height - strokeWidth}, ${width / 2} ${height - strokeWidth}
                  Q ${width - strokeWidth} ${height - strokeWidth}, ${width - strokeWidth} ${height - ellipseHeight - strokeWidth}
                  L ${width - strokeWidth} ${ellipseHeight + strokeWidth}`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <ellipse
              cx={width / 2}
              cy={ellipseHeight + strokeWidth}
              rx={width / 2 - strokeWidth}
              ry={ellipseHeight}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </>
        )

      case 'display':
        const displayCurve = 30
        return (
          <path
            d={`M ${displayCurve + strokeWidth} ${strokeWidth}
                L ${width - strokeWidth} ${strokeWidth}
                L ${width - strokeWidth} ${height - strokeWidth}
                L ${displayCurve + strokeWidth} ${height - strokeWidth}
                Q ${strokeWidth} ${height / 2}, ${displayCurve + strokeWidth} ${strokeWidth}`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )

      case 'manual-operation':
        const trapezoidOffset = 25
        return (
          <polygon
            points={`${trapezoidOffset + strokeWidth},${strokeWidth} ${width - trapezoidOffset - strokeWidth},${strokeWidth} ${width - strokeWidth},${height - strokeWidth} ${strokeWidth},${height - strokeWidth}`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )

      case 'loop-limit':
        const loopOffset = 15
        return (
          <polygon
            points={`${loopOffset + strokeWidth},${strokeWidth} ${width - loopOffset - strokeWidth},${strokeWidth} ${width - strokeWidth},${loopOffset + strokeWidth} ${width - strokeWidth},${height - strokeWidth} ${strokeWidth},${height - strokeWidth} ${strokeWidth},${loopOffset + strokeWidth}`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )

      case 'merge':
        return (
          <polygon
            points={`${strokeWidth},${strokeWidth} ${width - strokeWidth},${strokeWidth} ${width / 2},${height - strokeWidth}`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )

      case 'or':
        const orR = Math.min(width, height) / 2 - strokeWidth
        return (
          <>
            <circle
              cx={width / 2}
              cy={height / 2}
              r={orR}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <line
              x1={width / 2}
              y1={strokeWidth}
              x2={width / 2}
              y2={height - strokeWidth}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <line
              x1={strokeWidth}
              y1={height / 2}
              x2={width - strokeWidth}
              y2={height / 2}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </>
        )

      case 'summing-junction':
        const sjR = Math.min(width, height) / 2 - strokeWidth
        const offset = sjR * 0.707
        return (
          <>
            <circle
              cx={width / 2}
              cy={height / 2}
              r={sjR}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <line
              x1={width / 2 - offset}
              y1={height / 2 - offset}
              x2={width / 2 + offset}
              y2={height / 2 + offset}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <line
              x1={width / 2 + offset}
              y1={height / 2 - offset}
              x2={width / 2 - offset}
              y2={height / 2 + offset}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </>
        )

      case 'collate':
        return (
          <>
            <polygon
              points={`${strokeWidth},${strokeWidth} ${width - strokeWidth},${strokeWidth} ${width / 2},${height / 2}`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
            />
            <polygon
              points={`${width / 2},${height / 2} ${width - strokeWidth},${height - strokeWidth} ${strokeWidth},${height - strokeWidth}`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
            />
          </>
        )

      case 'sort':
        return (
          <>
            <polygon
              points={`${width / 2},${strokeWidth} ${width - strokeWidth},${height / 2} ${width / 2},${height - strokeWidth} ${strokeWidth},${height / 2}`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
            />
            <line
              x1={strokeWidth}
              y1={height / 2}
              x2={width - strokeWidth}
              y2={height / 2}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </>
        )

      case 'stored-data':
        const sdCurve = 20
        return (
          <path
            d={`M ${sdCurve + strokeWidth} ${strokeWidth}
                L ${width - strokeWidth} ${strokeWidth}
                Q ${width - sdCurve - strokeWidth} ${height / 2}, ${width - strokeWidth} ${height - strokeWidth}
                L ${sdCurve + strokeWidth} ${height - strokeWidth}
                Q ${strokeWidth} ${height / 2}, ${sdCurve + strokeWidth} ${strokeWidth}`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )

      case 'internal-storage':
        const margin = 15
        return (
          <>
            <rect
              x={strokeWidth}
              y={strokeWidth}
              width={width - strokeWidth * 2}
              height={height - strokeWidth * 2}
              rx={4}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <line
              x1={strokeWidth}
              y1={margin + strokeWidth}
              x2={width - strokeWidth}
              y2={margin + strokeWidth}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <line
              x1={margin + strokeWidth}
              y1={strokeWidth}
              x2={margin + strokeWidth}
              y2={height - strokeWidth}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </>
        )

      default:
        return (
          <rect
            x={strokeWidth}
            y={strokeWidth}
            width={width - strokeWidth * 2}
            height={height - strokeWidth * 2}
            rx={4}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        )
    }
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      {renderShape()}
    </svg>
  )
}
