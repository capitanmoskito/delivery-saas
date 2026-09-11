export interface BusinessCoordinates {
  latitude: number | null;
  longitude: number | null;
}

export function isValidCoordinates(
  latitude: number | null,
  longitude: number | null
): boolean {
  if (latitude === null || longitude === null) {
    return true;
  }

  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function createMapboxPlaceholder(): BusinessCoordinates {
  return {
    latitude: null,
    longitude: null
  };
}