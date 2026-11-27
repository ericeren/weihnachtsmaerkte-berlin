export interface DateWheelProps {
  value: Date;
  /** datetime: Tag, Stunde und Minute. date: nur der Tag. */
  mode: 'datetime' | 'date';
  minimumDate: Date;
  maximumDate: Date;
  onChange: (d: Date) => void;
}
