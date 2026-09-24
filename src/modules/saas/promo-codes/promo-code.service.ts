import { PromoCodeRepository } from "./promo-code.repository";

export class PromoCodeService {
  private repository = new PromoCodeRepository();

  async getAllPromoCodes() {
    return this.repository.findAll();
  }

  async createPromoCode(input: {
    code: string;
    description?: string;
    discountPercent: number;
    usageLimit?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
  }) {
    const code = input.code.trim().toUpperCase();

    if (!code) {
      throw new Error("El código es obligatorio");
    }

    return this.repository.create({
      code,
      description: input.description?.trim() || null,
      discountPercent: input.discountPercent,
      usageLimit: input.usageLimit ?? null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null
    });
  }

  async setActive(id: string, active: boolean) {
    return this.repository.toggleActive(id, active);
  }
}
