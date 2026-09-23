/**
 * Google Play Billing seam. The Premium screen talks only to this interface, so Stage 8 can plug in a real
 * implementation (e.g. react-native-iap) without touching UI code.
 *
 * Purchase flow (Stage 8):
 *   1. getProducts(['renewly_pro_monthly', 'renewly_pro_yearly'])  – ids come from GET /plans (googlePlayProductId)
 *   2. purchase(productId) → purchaseToken
 *   3. POST the token to the API, which verifies it with the Google Play Developer API and creates a UserPlan
 *   4. acknowledge only after the server confirms (Play refunds unacknowledged purchases after 3 days)
 */
export interface BillingProduct {
  productId: string;
  title: string;
  /** Localised price string from Play, e.g. "$2.99". Always show this, never a hard-coded price. */
  formattedPrice: string;
  billingPeriod: 'P1M' | 'P1Y' | string;
}

export interface PurchaseResult {
  productId: string;
  purchaseToken: string;
  orderId: string | null;
}

export class BillingUnavailableError extends Error {
  constructor() {
    super('In-app purchases are not available yet.');
    this.name = 'BillingUnavailableError';
  }
}

export interface BillingProvider {
  isAvailable(): Promise<boolean>;
  getProducts(productIds: string[]): Promise<BillingProduct[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  /** Re-sends existing purchases to the server (new device / reinstall). */
  restore(): Promise<PurchaseResult[]>;
}

/** Used until Google Play Billing is integrated. The Premium screen shows plans but disables purchase. */
export const unavailableBilling: BillingProvider = {
  isAvailable: async () => false,
  getProducts: async () => [],
  purchase: async () => {
    throw new BillingUnavailableError();
  },
  restore: async () => [],
};

export const billing: BillingProvider = unavailableBilling;
