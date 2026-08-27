import { SaaSRepository }
  from "./saas.repository";

export class SaaSService {

  private repository =
    new SaaSRepository();

  async getDashboardMetrics() {

    return this.repository
      .getMetrics();
  }
}