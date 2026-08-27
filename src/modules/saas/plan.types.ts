export interface CreatePlanDto {
  name: string;
  description?: string;
  price: number;
}

export interface UpdatePlanDto {
  name: string;
  description?: string;
  price: number;
  active: boolean;
}