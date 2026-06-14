export interface User {
  id: string;
  email: string;
  name: string;
  stocks: Record<string, number>;
  thresholds: Record<string, number>;
}

export interface Sale {
  id: string;
  userId: string;
  date: string;
  product: string;
  qty: number;
  price: number;
  revenue: number;
}

export interface AIBriefAction {
  product: string;
  type: "buy" | "reduce" | "hold";
  message: string;
}

export interface AIBriefResponse {
  brief: string;
  actions: AIBriefAction[];
}

export interface ForecastResult {
  [product: string]: number[];
}
