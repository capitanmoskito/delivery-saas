import { PlanRepository }
  from "./plan.repository";

export class PlanService {

  private repository =
    new PlanRepository();

  async getAllPlans() {
    return this.repository.findAll();
  }
}