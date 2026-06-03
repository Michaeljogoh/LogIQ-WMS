export const DEMO_SLUG = "demo-3pl";
export const DEMO_OWNER_EMAIL = "demo@logiq.internal";
export const DEMO_MANAGER_EMAIL = "manager@demo.logiq";
export const DEMO_STAFF1_EMAIL = "staff1@demo.logiq";
export const DEMO_STAFF2_EMAIL = "staff2@demo.logiq";
export const DEMO_MERCHANT_OWNER_EMAIL = "merchant@apexsportswear.demo";
export const DEMO_MERCHANT_USER_EMAIL = "user@apexsportswear.demo";
export const DEMO_PASSWORD = "Demo123!";

export type SeedContext = {
  // --- Auth layer ---
  orgId: string;
  ownerAuthUserId: string;
  managerAuthUserId: string;
  staff1AuthUserId: string;
  staff2AuthUserId: string;
  merchantOwnerAuthUserId: string;
  merchantUserAuthUserId: string;

  // --- LogIQ account ---
  accountId: string;
  ownerAccountUserId: string;
  managerAccountUserId: string;
  staff1AccountUserId: string;
  staff2AccountUserId: string;

  // --- Warehouses ---
  laxId: string;
  ordId: string;
  /** All bins for LAX warehouse */
  laxBins: string[];
  /** All bins for ORD warehouse */
  ordBins: string[];

  // --- Merchants ---
  apexId: string;
  novatechId: string;
  lumiereId: string;
  apexContractId: string;
  novatechContractId: string;
  lumiereContractId: string;

  // --- Products (ordered arrays per merchant) ---
  apexProductIds: string[];
  novatechProductIds: string[];
  lumiereProductIds: string[];

  // --- Packaging types ---
  packagingTypeIds: string[];

  // --- Suppliers ---
  apexSupplierIds: string[];
  novatechSupplierIds: string[];
  lumiereSupplierIds: string[];

  // --- Orders ---
  orderIds: string[];
  fulfilledOrderIds: string[];
  unfulfilledOrderIds: string[];

  // --- Shipments ---
  shipmentIds: string[];

  // --- Invoices ---
  invoiceIds: string[];

  // --- Label templates ---
  labelTemplateIds: string[];

  // --- Integrations ---
  integrationIds: string[];
};
