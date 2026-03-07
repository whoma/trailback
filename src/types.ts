export type LatLng = [number, number];

export interface Route {
  id: string;
  name: string;
  points: LatLng[];
  distance: number;
  duration: number;
  createdAt: number;
}
