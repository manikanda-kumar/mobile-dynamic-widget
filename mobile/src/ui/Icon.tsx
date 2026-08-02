import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

type GlyphProps = { color: string; sw: number };

/** Geometric line glyphs, one per widget family. No emoji, no icon font. */
const glyphs: Record<string, (p: GlyphProps) => React.ReactNode> = {
  loan: ({ color, sw }) => (
    <>
      <Rect x={1.75} y={6} width={20.5} height={12} rx={3} stroke={color} strokeWidth={sw} />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={sw} />
      <Circle cx={5.4} cy={12} r={0.9} fill={color} />
      <Circle cx={18.6} cy={12} r={0.9} fill={color} />
    </>
  ),
  card: ({ color, sw }) => (
    <>
      <Rect x={1.75} y={5} width={20.5} height={14} rx={3} stroke={color} strokeWidth={sw} />
      <Line x1={1.75} y1={9.6} x2={22.25} y2={9.6} stroke={color} strokeWidth={sw} />
      <Rect x={5} y={13.5} width={5.5} height={2.2} rx={1.1} fill={color} />
    </>
  ),
  fd: ({ color, sw }) => (
    <>
      <Circle cx={12} cy={12} r={8.75} stroke={color} strokeWidth={sw} />
      <Circle cx={12} cy={12} r={3.1} stroke={color} strokeWidth={sw} />
      <Line x1={12} y1={3.25} x2={12} y2={6.2} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Line x1={12} y1={17.8} x2={12} y2={20.75} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Line x1={3.25} y1={12} x2={6.2} y2={12} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Line x1={17.8} y1={12} x2={20.75} y2={12} stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  pledge: ({ color, sw }) => (
    <>
      <Path d="M10 7.25H7.5a4.75 4.75 0 0 0 0 9.5H10" stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <Path d="M14 7.25h2.5a4.75 4.75 0 0 1 0 9.5H14" stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <Line x1={8.25} y1={12} x2={15.75} y2={12} stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  kyc: ({ color, sw }) => (
    <>
      <Rect x={1.75} y={4.5} width={20.5} height={15} rx={3} stroke={color} strokeWidth={sw} />
      <Circle cx={8} cy={10.75} r={2.35} stroke={color} strokeWidth={sw} />
      <Path d="M4.4 16.4c.65-1.9 2.05-2.85 3.6-2.85s2.95.95 3.6 2.85" stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <Line x1={14.75} y1={10} x2={19.75} y2={10} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Line x1={14.75} y1={14} x2={18.25} y2={14} stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  vkyc: ({ color, sw }) => (
    <>
      <Rect x={2} y={5.5} width={13.5} height={13} rx={3} stroke={color} strokeWidth={sw} />
      <Path d="M17.75 10.4 22 7.6v8.8l-4.25-2.8z" stroke={color} strokeWidth={sw} strokeLinejoin="round" fill="none" />
      <Circle cx={8.75} cy={12} r={2.5} stroke={color} strokeWidth={sw} />
    </>
  ),
  email: ({ color, sw }) => (
    <>
      <Rect x={1.75} y={5} width={20.5} height={14} rx={3} stroke={color} strokeWidth={sw} />
      <Polyline points="2.9,7.4 12,13.6 21.1,7.4" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  mobile: ({ color, sw }) => (
    <>
      <Rect x={6.5} y={2.5} width={11} height={19} rx={3} stroke={color} strokeWidth={sw} />
      <Line x1={10.5} y1={5.75} x2={13.5} y2={5.75} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Circle cx={12} cy={17.8} r={1.1} fill={color} />
    </>
  ),
  gift: ({ color, sw }) => (
    <>
      <Rect x={2.75} y={8.25} width={18.5} height={4.5} rx={1.5} stroke={color} strokeWidth={sw} />
      <Path d="M4.75 12.75v6.5a2 2 0 0 0 2 2h10.5a2 2 0 0 0 2-2v-6.5" stroke={color} strokeWidth={sw} fill="none" />
      <Line x1={12} y1={8.25} x2={12} y2={21.25} stroke={color} strokeWidth={sw} />
      <Path d="M12 8.25S10.6 3.1 8.2 3.1a2.55 2.55 0 0 0 0 5.15z" stroke={color} strokeWidth={sw} strokeLinejoin="round" fill="none" />
      <Path d="M12 8.25s1.4-5.15 3.8-5.15a2.55 2.55 0 0 1 0 5.15z" stroke={color} strokeWidth={sw} strokeLinejoin="round" fill="none" />
    </>
  ),
  anniversary: ({ color, sw }) => (
    <>
      <Circle cx={12} cy={15} r={5.75} stroke={color} strokeWidth={sw} />
      <Circle cx={12} cy={15} r={2} fill={color} />
      <Path d="M8.9 10.2 6.4 2.9" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M15.1 10.2 17.6 2.9" stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  rewards: ({ color, sw }) => (
    <>
      <Path d="M12 3.4 3.4 9.6 12 20.6 20.6 9.6z" stroke={color} strokeWidth={sw} strokeLinejoin="round" fill="none" />
      <Line x1={3.4} y1={9.6} x2={20.6} y2={9.6} stroke={color} strokeWidth={sw} />
      <Path d="M12 3.4 8.4 9.6 12 20.6 15.6 9.6z" stroke={color} strokeWidth={sw} strokeLinejoin="round" fill="none" />
    </>
  ),
  cashback: ({ color, sw }) => (
    <>
      <Path d="M3.6 12a8.4 8.4 0 1 1 2.7 6.2" stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <Polyline points="3.6,7.6 3.6,12 8,12" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={12} cy={12} r={2.6} stroke={color} strokeWidth={sw} />
    </>
  ),
  payments: ({ color, sw }) => (
    <>
      <Rect x={4.5} y={2.5} width={15} height={19} rx={2.75} stroke={color} strokeWidth={sw} />
      <Line x1={8.25} y1={8} x2={15.75} y2={8} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Line x1={8.25} y1={12} x2={15.75} y2={12} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Line x1={8.25} y1={16} x2={12.75} y2={16} stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  investments: ({ color, sw }) => (
    <>
      <Polyline points="2.75,17 8.75,10.75 12.75,14.5 21.25,6" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Polyline points="15.5,6 21.25,6 21.25,11.5" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  refresh: ({ color, sw }) => (
    <>
      <Path d="M20.4 12a8.4 8.4 0 1 1-2.46-5.94" stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <Polyline points="20.4,2.9 20.4,7.5 15.8,7.5" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  layers: ({ color, sw }) => (
    <>
      <Path d="M12 2.9 21.5 8 12 13.1 2.5 8z" stroke={color} strokeWidth={sw} strokeLinejoin="round" fill="none" />
      <Polyline points="2.5,13 12,18.1 21.5,13" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  fallback: ({ color, sw }) => (
    <>
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={sw} />
      <Circle cx={12} cy={12} r={2.2} fill={color} />
    </>
  ),
};

export type IconName = keyof typeof glyphs;

export function Icon({
  name,
  color,
  size = 20,
  strokeWidth = 1.6,
}: {
  name?: string | null;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const glyph = glyphs[(name ?? '') as IconName] ?? glyphs.fallback;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* strokeWidth is the desired on-screen px; convert into the 24u viewBox. */}
      {glyph({ color, sw: (strokeWidth * 24) / size })}
    </Svg>
  );
}
