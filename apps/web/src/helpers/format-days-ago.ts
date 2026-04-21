import { differenceInCalendarDays, isToday, isYesterday } from "date-fns";

export const formatDaysAgo = (date: Date | string | number) => {
  const targetDate = new Date(date);

  if (isToday(targetDate)) return "Today";
  if (isYesterday(targetDate)) return "Yesterday";

  const daysAgo = differenceInCalendarDays(new Date(), targetDate);

  return `${daysAgo} Days Ago`;
};
