import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

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

const GOLD = '#C9A227';

/** Logo: der Fernsehturm, dessen Kugel eine Christbaumkugel ist, in einem runden Abzeichen mit Schnee. */
export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Logo Weihnachtsmärkte Berlin">
      <Defs>
        <ClipPath id="logoInnen">
          <Circle cx={50} cy={50} r={45} />
        </ClipPath>
      </Defs>
      <Circle cx={50} cy={50} r={47} fill={colors.creme} />
      <G clipPath="url(#logoInnen)">
        {/* Schnee und Lichter */}
        <Path d="M0 83 Q50 75 100 83 L100 100 L0 100 Z" fill={colors.weiss} />
        <G fill={GOLD}>
          <Circle cx={25} cy={31} r={1.8} />
          <Circle cx={75} cy={27} r={1.6} />
          <Circle cx={79} cy={52} r={1.4} />
          <Circle cx={22} cy={57} r={1.5} />
          <Circle cx={31} cy={19} r={1.2} />
          <Circle cx={69} cy={15} r={1.1} />
        </G>
      </G>
      {/* Turm */}
      <Polygon points="45.5,85 54.5,85 52.2,56 47.8,56" fill={colors.tinte} />
      <Rect x={44} y={55} width={12} height={3.2} rx={1.2} fill={colors.tinte} />
      {/* Kugel mit Glanz und Kappe */}
      <Circle cx={50} cy={42} r={14.5} fill={colors.rot} />
      <Ellipse
        cx={44.5}
        cy={36.5}
        rx={4.2}
        ry={2.8}
        fill={colors.weiss}
        opacity={0.55}
        rotation={-35}
        originX={44.5}
        originY={36.5}
      />
      <Rect x={46.2} y={25} width={7.6} height={4.6} rx={1} fill={GOLD} />
      {/* Spitze mit Antenne */}
      <Rect x={48.7} y={12} width={2.6} height={13.5} fill={colors.tinte} />
      <Rect x={49.4} y={6} width={1.2} height={7} fill={colors.tinte} />
      <Circle cx={50} cy={50} r={47} fill="none" stroke={colors.rot} strokeWidth={5} />
    </Svg>
  );
}
