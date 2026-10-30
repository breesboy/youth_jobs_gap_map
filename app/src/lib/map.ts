type Ring = [number, number][];

const MIN_LON = 28.8;
const MAX_LAT = -1.04;
const SCALE = 260;
const COS = Math.cos((-1.95 * Math.PI) / 180);

const project = ([lon, lat]: [number, number]) => [
  (lon - MIN_LON) * COS * SCALE,
  (MAX_LAT - lat) * SCALE,
];

function ringPath(ring: Ring) {
  return (
    ring
      .map((point, index) => {
        const [x, y] = project(point);
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join("") + "Z"
  );
}

export function geometryPath(geometry: { type: string; coordinates: unknown }) {
  if (geometry.type === "Polygon") {
    return (geometry.coordinates as Ring[]).map(ringPath).join("");
  }
  return (geometry.coordinates as Ring[][]).flatMap((polygon) => polygon.map(ringPath)).join("");
}

export const MAP_WIDTH = (30.95 - MIN_LON) * COS * SCALE;
export const MAP_HEIGHT = (MAX_LAT + 2.9) * SCALE;
