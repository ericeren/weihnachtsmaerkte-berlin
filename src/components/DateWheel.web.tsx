import { createElement } from 'react';

import { colors } from '../theme';
import type { DateWheelProps } from './DateWheel.types';

// Dieselbe Schrift wie alle Texte der Seite. Ohne eigene Angabe nimmt ein Eingabefeld die Standardschrift
// des Browsers, oft eine Serifenschrift.
const SYSTEM_FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function fmt(d: Date, mode: DateWheelProps['mode']): string {
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return mode === 'date' ? day : `${day}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Ersatz für den Browser: das Auswahlrad gibt es nur auf dem iPhone. */
export default function DateWheel({ value, mode, minimumDate, maximumDate, onChange }: DateWheelProps) {
  return createElement('input', {
    type: mode === 'date' ? 'date' : 'datetime-local',
    value: fmt(value, mode),
    min: fmt(minimumDate, mode),
    max: fmt(maximumDate, mode),
    step: 300,
    onChange: (e: { target: { value: string } }) => {
      const [day, time = '00:00'] = e.target.value.split('T');
      const [y, m, d] = day.split('-').map(Number);
      const [h, min] = time.split(':').map(Number);
      if (y && m && d) onChange(new Date(y, m - 1, d, h || 0, min || 0));
    },
    style: {
      margin: '28px 16px',
      padding: 14,
      fontSize: 20,
      fontFamily: SYSTEM_FONT,
      fontWeight: 600,
      color: colors.tinte,
      backgroundColor: colors.weiss,
      border: `1px solid ${colors.linie}`,
      borderRadius: 10,
    },
  });
}
