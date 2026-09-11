export interface PostalCodeLookup {
  postalCode: string;
  country: string;
  state: string;
  city: string;
  neighborhood: string;
}

export async function lookupPostalCode(
  postalCode: string
): Promise<PostalCodeLookup | null> {
  void postalCode;

  // COPOMEX integration will be added here without changing the route contract.
  return null;
}