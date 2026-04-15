export type MarketSlug = "forney" | "new-braunfels";

export const payerMixByMarket: Record<
  MarketSlug,
  {
    govtShare: number;
    commercialShare: number;
    commercialSplit: {
      bcbs: number;
      aetnaUhccigna: number;
    };
  }
> = {
  forney: {
    govtShare: 0.15,        // SC!B146
    commercialShare: 0.85,  // SC!C146
    commercialSplit: {
      bcbs: 0.30,           // SC!B154 — was 0.25, corrected to 0.30
      aetnaUhccigna: 0.70,  // SC!B155 — was 0.75, corrected to 0.70
    },
  },
  "new-braunfels": {
    govtShare: 0.25,        // SC!B145
    commercialShare: 0.75,  // SC!C145
    commercialSplit: {
      bcbs: 0.30,           // SC!B154 — consistent with Forney (same sub-payer breakdown)
      aetnaUhccigna: 0.70,  // SC!B155
    },
  },
};

export function getPayerWeights(market: MarketSlug): {
  govtWeight: number;
  commercialWeight: number;
  bcbsWeight: number;
  aetnaUhccignaWeight: number;
} {
  const config = payerMixByMarket[market];
  const govtWeight = config.govtShare;
  const commercialWeight = config.commercialShare;
  const bcbsWeight = commercialWeight * config.commercialSplit.bcbs;
  const aetnaUhccignaWeight = commercialWeight * config.commercialSplit.aetnaUhccigna;

  if (Math.abs(govtWeight + commercialWeight - 1) >= 1e-9) {
    throw new Error(`Payer mix invariant violated for ${market}: govt + commercial = ${govtWeight + commercialWeight}`);
  }
  if (Math.abs(bcbsWeight + aetnaUhccignaWeight - commercialWeight) >= 1e-9) {
    throw new Error(`Commercial split invariant violated for ${market}: bcbs + aetnaUhcCigna = ${bcbsWeight + aetnaUhccignaWeight}`);
  }

  return { govtWeight, commercialWeight, bcbsWeight, aetnaUhccignaWeight };
}
