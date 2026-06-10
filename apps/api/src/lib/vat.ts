const DEFAULT_VAT_RATE = 7.0;

export function getVatRate(): number {
  const envVat = process.env.VAT_RATE;
  if (envVat) {
    const rate = parseFloat(envVat);
    if (!isNaN(rate)) return rate;
  }
  return DEFAULT_VAT_RATE;
}

export interface VatCalculationResult {
  vatRate: number;
  amountBeforeTax: number;
  vatAmount: number;
  totalAmount: number;
}

/**
 * Calculate VAT based on Included or Excluded VAT option.
 */
export function calculateVat(
  value: number,
  option: "included" | "excluded",
  customRate?: number
): VatCalculationResult {
  const rate = customRate ?? getVatRate();
  const round2 = (num: number) => Math.round(num * 100) / 100;

  if (option === "included") {
    const totalAmount = value;
    const vatAmount = round2(totalAmount * (rate / (100 + rate)));
    const amountBeforeTax = round2(totalAmount - vatAmount);
    return {
      vatRate: rate,
      amountBeforeTax,
      vatAmount,
      totalAmount,
    };
  } else {
    const amountBeforeTax = value;
    const vatAmount = round2(amountBeforeTax * (rate / 100));
    const totalAmount = round2(amountBeforeTax + vatAmount);
    return {
      vatRate: rate,
      amountBeforeTax,
      vatAmount,
      totalAmount,
    };
  }
}
