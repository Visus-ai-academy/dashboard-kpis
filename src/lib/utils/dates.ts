function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isBusinessDay(
  date: Date,
  nonWorkingDates: Date[] = [],
  includeSaturday = false,
  includeSunday = false
): boolean {
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 0 && !includeSunday) return false;
  if (dayOfWeek === 6 && !includeSaturday) return false;

  if (nonWorkingDates.some((nwd) => isSameDay(nwd, date))) {
    return false;
  }

  return true;
}

export function getBusinessDaysInMonth(
  month: number,
  year: number,
  nonWorkingDates: Date[] = [],
  includeSaturday = false,
  includeSunday = false
): number {
  let count = 0;
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (isBusinessDay(date, nonWorkingDates, includeSaturday, includeSunday)) {
      count++;
    }
  }

  return count;
}

export function getRemainingBusinessDays(
  month: number,
  year: number,
  nonWorkingDates: Date[] = [],
  includeSaturday = false,
  includeSunday = false
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date <= today) continue;
    if (isBusinessDay(date, nonWorkingDates, includeSaturday, includeSunday)) {
      count++;
    }
  }

  return count;
}
