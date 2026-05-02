import { db } from "@/lib/db";
import type { LogiqJobPayload } from "@/server/jobs/queues";
import { runCapacityForecastForAccount } from "@/server/logiq/capacity-forecast";
import { runCarrierScorecardForAccount } from "@/server/logiq/carrier-scorecard-job";
import { runInsightDigestForAccount } from "@/server/logiq/insight-digest";
import { runOverstockScanForAccount } from "@/server/logiq/overstock-scan";
import { runPickRateScanForAccount } from "@/server/logiq/pick-rate-scan";
import { runStockoutScanForAccount } from "@/server/logiq/stockout-scan";

async function eachAccount(
  accountId: string | undefined,
  fn: (id: string) => Promise<void>,
): Promise<void> {
  if (accountId) {
    await fn(accountId);
    return;
  }
  const accounts = await db.logiqAccount.findMany({ select: { id: true } });
  for (const a of accounts) {
    await fn(a.id);
  }
}

export async function processLogiqJob(job: LogiqJobPayload): Promise<void> {
  switch (job.name) {
    case "logiq.stockoutScan":
      await eachAccount(job.payload.accountId, runStockoutScanForAccount);
      break;
    case "logiq.overstockScan":
      await eachAccount(job.payload.accountId, runOverstockScanForAccount);
      break;
    case "logiq.carrierScorecard":
      await eachAccount(job.payload.accountId, runCarrierScorecardForAccount);
      break;
    case "logiq.capacityForecast":
      await eachAccount(job.payload.accountId, runCapacityForecastForAccount);
      break;
    case "logiq.pickRateScan":
      await eachAccount(job.payload.accountId, runPickRateScanForAccount);
      break;
    case "logiq.insightDigest":
      await eachAccount(job.payload.accountId, runInsightDigestForAccount);
      break;
    default:
      throw new Error("Unknown LogIQ job");
  }
}
