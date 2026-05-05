export function dayString(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

export function isoRangeForUpcomingHour(offsetMinutes = 0, durationMinutes = 30) {
  const start = new Date();
  start.setUTCSeconds(0, 0);
  start.setUTCMinutes(start.getUTCMinutes() + offsetMinutes);

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}
