import {
  PromotionRepository
} from "./promotion.repository";

export class PromotionService {

  private repository =
    new PromotionRepository();

  async getAllPromotions() {

    return this.repository.findAll();
  }
}