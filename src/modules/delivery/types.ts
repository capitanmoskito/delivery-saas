export type PickupStop = {
  type: "pickup";
  tenantId: string;
  businessName: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

export type DropStop = {
  type: "drop";
  code: string;
  tenantId: string;
  businessName: string;
  orderNumber: string | null;
  customerName: string | null;
  address: string;
  reference: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  total: number;
  paymentStatus: string;
  startedAt: string;
  items: Array<{ name: string; quantity: number }>;
};

export type DeliveryStop = PickupStop | DropStop;

export type DeliveryRouteResponse = { steps: DeliveryStop[]; invalidCodes: string[]; distanceKm: number };
