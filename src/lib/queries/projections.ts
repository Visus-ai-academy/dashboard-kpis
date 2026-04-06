import { prisma } from "@/lib/prisma";
import { isBusinessDay } from "@/lib/utils/dates";

/**
 * Returns the remaining business days for a given month/year,
 * respecting NonWorkingDay entries from the database and sat/sun toggles.
 */
export async function getRemainingBusinessDaysFromDB(
  companyId: string,
  month: number,
  year: number
): Promise<{
  totalBusinessDays: number;
  remainingBusinessDays: number;
  includeSaturday: boolean;
  includeSunday: boolean;
  nonWorkingDates: Date[];
}> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  // Fetch non-working days for this company in the given month
  const nonWorkingDays = await prisma.nonWorkingDay.findMany({
    where: {
      companyId,
      date: { gte: monthStart, lte: monthEnd },
    },
  });

  // Derive sat/sun toggles from the most recent NonWorkingDay config
  // If any NonWorkingDay record has includeSaturday/includeSunday = true,
  // it means the company WORKS on those days (i.e., they are business days)
  const includeSaturday = nonWorkingDays.some((d) => d.includeSaturday);
  const includeSunday = nonWorkingDays.some((d) => d.includeSunday);

  const nonWorkingDates = nonWorkingDays.map((d) => new Date(d.date));

  // Calculate total business days in the month
  const daysInMonth = monthEnd.getDate();
  let totalBusinessDays = 0;
  let remainingBusinessDays = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (isBusinessDay(date, nonWorkingDates, includeSaturday, includeSunday)) {
      totalBusinessDays++;
      if (date > today) {
        remainingBusinessDays++;
      }
    }
  }

  return {
    totalBusinessDays,
    remainingBusinessDays,
    includeSaturday,
    includeSunday,
    nonWorkingDates,
  };
}
