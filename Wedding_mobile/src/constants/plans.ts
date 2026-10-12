export type PlanName = "Starter" | "Plus" | "Premium";

/** Price in TSh per digital card. */
export const PLAN_PRICES: Record<PlanName, string> = {
  Starter: "500",
  Plus: "750",
  Premium: "950",
};

export function isPlanName(value: unknown): value is PlanName {
  return typeof value === "string" && value in PLAN_PRICES;
}
