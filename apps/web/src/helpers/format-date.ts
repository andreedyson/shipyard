import { format, Locale } from "date-fns";
import { enUS } from "date-fns/locale";

type FormatDateOptions = {
  format?: string;
  locale?: Locale;
};

export const formatDate = (
  date: Date | string | number,
  { format: dateFormat = "dd MMM yyyy", locale = enUS }: FormatDateOptions = {}
) => {
  return format(new Date(date), dateFormat, { locale });
};
