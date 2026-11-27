import DateTimePicker from '@react-native-community/datetimepicker';
import { StyleSheet } from 'react-native';

import { colors } from '../theme';
import type { DateWheelProps } from './DateWheel.types';

/** Das iOS-Auswahlrad für Datum und Uhrzeit, in Fünf-Minuten-Schritten wie in der BVG-App. */
export default function DateWheel({ value, mode, minimumDate, maximumDate, onChange }: DateWheelProps) {
  return (
    <DateTimePicker
      value={value}
      mode={mode}
      display="spinner"
      locale="de-DE"
      minuteInterval={5}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      themeVariant="light"
      textColor={colors.tinte}
      onValueChange={(_event, date) => onChange(date)}
      style={styles.wheel}
    />
  );
}

const styles = StyleSheet.create({
  wheel: { alignSelf: 'stretch', height: 216 },
});
