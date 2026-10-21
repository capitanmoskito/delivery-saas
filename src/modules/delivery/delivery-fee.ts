export type DeliveryFeeType = "fixed" | "per_km";

export type DeliveryFeeSettings = {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  feeType: DeliveryFeeType;
  fixedFee: number;
  perKmFee: number;
  maxDistanceKm: number | null;
};

export const defaultDeliverySettings: DeliveryFeeSettings = {
  pickupEnabled: true,
  deliveryEnabled: false,
  feeType: "fixed",
  fixedFee: 0,
  perKmFee: 0,
  maxDistanceKm: null,
};

type Coordinates = { latitude: number | null; longitude: number | null };

export type DeliveryFeeResult =
  | { ok: true; fee: number; distanceKm: number | null }
  | { ok: false; error: string };

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

// Great-circle distance between two points, in kilometers.
export function distanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const a = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(deltaLongitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateDeliveryFee(settings: DeliveryFeeSettings, origin: Coordinates, destination: Coordinates): DeliveryFeeResult {
  if (!settings.deliveryEnabled) return { ok: false, error: "Este negocio no ofrece envío a domicilio." };

  const hasOrigin = origin.latitude !== null && origin.longitude !== null;
  const hasDestination = destination.latitude !== null && destination.longitude !== null;
  const needsDistance = settings.feeType === "per_km" || settings.maxDistanceKm !== null;

  if (!needsDistance) return { ok: true, fee: roundTo(settings.fixedFee, 2), distanceKm: null };
  if (!hasDestination) return { ok: false, error: "Marca tu ubicación en el mapa de tu perfil para calcular el envío." };
  if (!hasOrigin) return { ok: false, error: "El negocio aún no configuró su ubicación para calcular el envío." };

  const distance = roundTo(distanceKm(
    { latitude: origin.latitude as number, longitude: origin.longitude as number },
    { latitude: destination.latitude as number, longitude: destination.longitude as number },
  ), 2);
  if (settings.maxDistanceKm !== null && distance > settings.maxDistanceKm) {
    return { ok: false, error: `Tu ubicación está a ${distance} km y el negocio entrega hasta ${settings.maxDistanceKm} km.` };
  }

  const fee = settings.feeType === "per_km" ? distance * settings.perKmFee : settings.fixedFee;
  return { ok: true, fee: roundTo(fee, 2), distanceKm: distance };
}
