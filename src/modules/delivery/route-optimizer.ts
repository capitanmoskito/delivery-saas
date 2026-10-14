export type Coordinates = { latitude: number; longitude: number };

export type PickupPoint = Coordinates & { tenantId: string };
export type DropPoint = { id: string; tenantId: string; latitude: number | null; longitude: number | null };

export type RouteStep =
  | { type: "pickup"; tenantId: string }
  | { type: "drop"; id: string };

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceKm(a: Coordinates, b: Coordinates) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function hasCoordinates(point: { latitude: number | null; longitude: number | null }): point is Coordinates {
  return point.latitude !== null && point.longitude !== null;
}

// Greedy nearest-neighbour: a drop is only reachable after its business pickup.
// Drops without coordinates go last, in the order received.
export function planRoute({ start, pickups, drops }: { start: Coordinates | null; pickups: PickupPoint[]; drops: DropPoint[] }): { steps: RouteStep[]; distanceKm: number } {
  const pickupsByTenant = new Map(pickups.map((pickup) => [pickup.tenantId, pickup]));
  const pendingPickups = new Set(drops.map((drop) => drop.tenantId).filter((tenantId) => pickupsByTenant.has(tenantId)));
  const located = drops.filter(hasCoordinates);
  const unlocated = drops.filter((drop) => !hasCoordinates(drop));
  const remaining = new Set(located.map((drop) => drop.id));
  const steps: RouteStep[] = [];
  let current: Coordinates | null = start;
  let total = 0;

  while (remaining.size > 0 || pendingPickups.size > 0) {
    let best: { step: RouteStep; point: Coordinates; cost: number } | null = null;
    const consider = (step: RouteStep, point: Coordinates) => {
      const cost = current ? distanceKm(current, point) : 0;
      if (!best || cost < best.cost) best = { step, point, cost };
    };

    for (const tenantId of pendingPickups) {
      const pickup = pickupsByTenant.get(tenantId);
      if (pickup) consider({ type: "pickup", tenantId }, pickup);
    }
    for (const drop of located) {
      if (remaining.has(drop.id) && !pendingPickups.has(drop.tenantId)) {
        consider({ type: "drop", id: drop.id }, { latitude: drop.latitude as number, longitude: drop.longitude as number });
      }
    }
    if (!best) break;

    const chosen: { step: RouteStep; point: Coordinates; cost: number } = best;
    steps.push(chosen.step);
    total += chosen.cost;
    current = chosen.point;
    if (chosen.step.type === "pickup") pendingPickups.delete(chosen.step.tenantId);
    else remaining.delete(chosen.step.id);
  }

  for (const drop of unlocated) steps.push({ type: "drop", id: drop.id });
  return { steps, distanceKm: Math.round(total * 10) / 10 };
}
