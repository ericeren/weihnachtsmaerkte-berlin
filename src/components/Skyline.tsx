import { View } from 'react-native';
import Svg, { Circle, G, Path, Polygon, Rect } from 'react-native-svg';

import { colors } from '../theme';

/**
 * Berliner Skyline als Schattenriss im Kopf der Übersicht: Rotes Rathaus, Dom, Tannen und niedrige Häuser.
 * Reiner Schmuck, deshalb für Bildschirmleser und Berührungen unsichtbar.
 *
 * Gezeichnet in Punkten vom rechten Rand aus. Die hohen Bauten stehen unter den beiden Knöpfen,
 * Rathaus unter der Statistik, Dom unter der Info. Links davon bleibt alles so niedrig, dass es
 * Titel und Untertitel nicht berührt. Den Fernsehturm zeigt schon das Logo.
 */

const BREITE = 250;

/** Tanne aus zwei Dreiecken, Fuß bei (x, boden) */
function tanne(x: number, boden: number, h: number): [string, string] {
  const p = (a: number, b: number) => `${a.toFixed(1)},${b.toFixed(1)}`;
  const unten = [p(x - 0.36 * h, boden), p(x + 0.36 * h, boden), p(x, boden - 0.72 * h)].join(' ');
  const oben = [p(x - 0.26 * h, boden - 0.42 * h), p(x + 0.26 * h, boden - 0.42 * h), p(x, boden - h)].join(' ');
  return [unten, oben];
}

export default function Skyline({ height: H }: { height: number }) {
  // Rathaus 86 Punkte vom rechten Rand, Dom 34 Punkte
  const rx = BREITE - 86;
  const dx = BREITE - 34;
  const tannen = [tanne(24, H, 12), tanne(70, H, 11), tanne(118, H, 13), tanne(140, H, 16), tanne(186, H, 15)];
  return (
    <View
      style={{ position: 'absolute', right: 0, bottom: 0, width: BREITE, height: H }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      <Svg width={BREITE} height={H} viewBox={`0 0 ${BREITE} ${H}`}>
        <G fill={colors.tanneHell}>
          {/* niedrige Häuser am Boden */}
          <Rect x={2} y={H - 8} width={14} height={8} />
          <Rect x={34} y={H - 11} width={12} height={11} />
          <Rect x={48} y={H - 8} width={16} height={8} />
          <Rect x={82} y={H - 10} width={14} height={10} />
          <Rect x={98} y={H - 12} width={12} height={12} />
          <Rect x={146} y={H - 9} width={8} height={9} />
          {/* Rotes Rathaus */}
          <Rect x={rx - 15} y={H - 24} width={30} height={24} />
          <Rect x={rx - 6} y={H - 50} width={12} height={26} />
          <Rect x={rx - 4} y={H - 56} width={8} height={6} />
          <Rect x={rx - 0.6} y={H - 64} width={1.2} height={8} />
          {/* Dom */}
          <Rect x={dx - 18} y={H - 18} width={36} height={18} />
          <Path d={`M${dx - 13} ${H - 18} A13 15 0 0 1 ${dx + 13} ${H - 18} Z`} />
          <Rect x={dx - 1.5} y={H - 41} width={3} height={9} />
          <Circle cx={dx} cy={H - 41} r={2.4} />
          <Rect x={dx - 21} y={H - 27} width={5} height={27} />
          <Rect x={dx + 16} y={H - 27} width={5} height={27} />
          <Circle cx={dx - 18.5} cy={H - 27} r={2.5} />
          <Circle cx={dx + 18.5} cy={H - 27} r={2.5} />
          {tannen.map(([unten, oben], i) => (
            <G key={i}>
              <Polygon points={unten} />
              <Polygon points={oben} />
            </G>
          ))}
        </G>
      </Svg>
    </View>
  );
}
