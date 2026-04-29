// AUDIT 2026-04-24 S-10 resolved: keys now match Market type in lib/types.ts
// (newBraunfels, forney). Prior kebab-case key "new-braunfels" would cause
// undefined lookups when consumers pass a.market directly.
export type MarketSlug = "forney" | "newBraunfels";

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
      bcbs: 0.30,           // SC!B154
      aetnaUhccigna: 0.70,  // SC!B155
    },
  },
  newBraunfels: {
    govtShare: 0.25,        // SC!B145
    commercialShare: 0.75,  // SC!C145
    commercialSplit: {
      bcbs: 0.30,           // SC!B154
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
