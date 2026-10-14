export type SalesPeriod = "day" | "week" | "month";

export type SalesBucket = {
  key: string;
  label: string;
  total: number;
  online: number;
  local: number;
};

export type ProductSales = { id: string; name: string; units: number };

export type WeekdayPattern = {
  weekday: number;
  label: string;
  // Average revenue per hour (index 0-23) for each occurrence of this weekday.
  hours: number[];
  averageRevenue: number;
};

export type MonthlyTrend = {
  key: string;
  label: string;
  revenue: number;
  orders: number;
  online: number;
  local: number;
};

export type SalesDashboardData = {
  period: SalesPeriod;
  anchor: string;
  today: string;
  rangeLabel: string;
  currency: string;
  chartUnit: "hour" | "day";
  buckets: SalesBucket[];
  totals: {
    revenue: number;
    online: number;
    local: number;
    orders: number;
    units: number;
    averageDaily: number;
  };
  insight: {
    summary: string;
    peak: string | null;
  };
  topProducts: ProductSales[];
  lowProducts: ProductSales[];
  patterns: {
    daysObserved: number;
    weekdays: WeekdayPattern[];
    monthly: MonthlyTrend[];
    insights: string[];
  };
  history: {
    revenue: number;
    orders: number;
    online: number;
    local: number;
    firstDate: string | null;
    months: MonthlyTrend[];
  };
};
