type ConvertCurrencyOptions = {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export const convertCurrency = (
  amount: number,
  {
    locale = "id-ID",
    currency = "IDR",
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  }: ConvertCurrencyOptions = {}
) => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
};
