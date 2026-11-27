import type { LatLng } from '../types';

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Luftlinie in Kilometern */
export function distanceKm(a: LatLng, lat: number, lng: number): number {
  const dLat = rad(lat - a.latitude);
  const dLng = rad(lng - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const BERLIN_REGION = {
  latitude: 52.507,
  longitude: 13.405,
  latitudeDelta: 0.34,
  longitudeDelta: 0.42,
};

/** Grobe Prüfung, ob ein Standort in oder nah an Berlin liegt */
export function nearBerlin(p: LatLng): boolean {
  return p.latitude > 52.2 && p.latitude < 52.8 && p.longitude > 12.9 && p.longitude < 13.95;
}
