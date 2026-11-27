import Svg, { Polygon, Rect } from 'react-native-svg';

import { colors } from '../theme';

/** Achtzackiger Stern: lange Strahlen oben, unten, links, rechts, kürzere diagonal. */
export function starPoints(cx: number, cy: number, r: number, inner = 0.3, short = 0.62): string {
  const pts: string[] = [];
  for (let k = 0; k < 16; k++) {
    const a = (-90 + k * 22.5) * (Math.PI / 180);
    const len = k % 2 === 1 ? r * inner : (k / 2) % 2 === 0 ? r : r * short;
    pts.push(`${(cx + Math.cos(a) * len).toFixed(2)},${(cy + Math.sin(a) * len).toFixed(2)}`);
  }
  return pts.join(' ');
}

export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Logo Weihnachtsmärkte Berlin">
      <Rect x={0} y={0} width={100} height={100} rx={20} fill={colors.rot} />
      <Polygon points={starPoints(50, 50, 38)} fill={colors.weiss} />
    </Svg>
  );
}
