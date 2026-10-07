/**
 * Grim Almanac — calendar math.
 * Pure functions, no Foundry dependency. Time is "absolute seconds" since
 * 00:00 on the first day of year 0 of the active calendar.
 */

export const DAY = 86400;
export const SEASONS = ["winter", "spring", "summer", "autumn"];
export const MOON_PHASES = [
  "new", "waxingCrescent", "firstQuarter", "waxingGibbous",
  "full", "waningGibbous", "lastQuarter", "waningCrescent"
];

/**
 * A calendar is a list of "months". A festival is simply a short month.
 *   days      length in a normal year
 *   leapDays  length in a leap year (defaults to `days`)
 *   season    winter | spring | summer | autumn
 *   festival  true for holidays that sit between months
 */
export const PRESETS = {
  harptos: {
    preset: "harptos",
    era: "DR",
    leapInterval: 4,
    months: [
      { name: "Hammer", days: 30, season: "winter" },
      { name: "Midwinter", days: 1, season: "winter", festival: true },
      { name: "Alturiak", days: 30, season: "winter" },
      { name: "Ches", days: 30, season: "spring" },
      { name: "Tarsakh", days: 30, season: "spring" },
      { name: "Greengrass", days: 1, season: "spring", festival: true },
      { name: "Mirtul", days: 30, season: "spring" },
      { name: "Kythorn", days: 30, season: "summer" },
      { name: "Flamerule", days: 30, season: "summer" },
      { name: "Midsummer", days: 1, season: "summer", festival: true },
      { name: "Shieldmeet", days: 0, leapDays: 1, season: "summer", festival: true },
      { name: "Eleasias", days: 30, season: "summer" },
      { name: "Eleint", days: 30, season: "autumn" },
      { name: "Highharvestide", days: 1, season: "autumn", festival: true },
      { name: "Marpenoth", days: 30, season: "autumn" },
      { name: "Uktar", days: 30, season: "autumn" },
      { name: "Feast of the Moon", days: 1, season: "autumn", festival: true },
      { name: "Nightal", days: 30, season: "winter" }
    ]
  },
  gregorian: {
    preset: "gregorian",
    era: "",
    leapInterval: 4,
    months: [
      { name: "January", days: 31, season: "winter" },
      { name: "February", days: 28, leapDays: 29, season: "winter" },
      { name: "March", days: 31, season: "spring" },
      { name: "April", days: 30, season: "spring" },
      { name: "May", days: 31, season: "spring" },
      { name: "June", days: 30, season: "summer" },
      { name: "July", days: 31, season: "summer" },
      { name: "August", days: 31, season: "summer" },
      { name: "September", days: 30, season: "autumn" },
      { name: "October", days: 31, season: "autumn" },
      { name: "November", days: 30, season: "autumn" },
      { name: "December", days: 31, season: "winter" }
    ]
  }
};

export function clonePreset(key) {
  return JSON.parse(JSON.stringify(PRESETS[key] ?? PRESETS.harptos));
}

/** Make sure whatever came out of settings is a usable calendar. */
export function sanitizeCalendar(cal) {
  if (!cal || !Array.isArray(cal.months)) return clonePreset("harptos");
  const months = cal.months
    .map((m) => {
      const days = Math.max(0, Math.floor(Number(m.days) || 0));
      const leapRaw = m.leapDays === undefined || m.leapDays === null || m.leapDays === "" ? days : Number(m.leapDays);
      const leapDays = Math.max(0, Math.floor(Number.isFinite(leapRaw) ? leapRaw : days));
      return {
        name: String(m.name ?? "").trim() || "Month",
        days,
        leapDays,
        season: SEASONS.includes(m.season) ? m.season : "spring",
        festival: !!m.festival
      };
    })
    .filter((m) => m.days > 0 || m.leapDays > 0);
  const base = months.reduce((s, m) => s + m.days, 0);
  if (!months.length || base < 1) return clonePreset("harptos");
  return {
    preset: cal.preset ?? "custom",
    era: String(cal.era ?? ""),
    leapInterval: Math.max(0, Math.floor(Number(cal.leapInterval) || 0)),
    months
  };
}

export function isLeap(cal, year) {
  const n = cal.leapInterval;
  return n > 0 && year % n === 0;
}

function segLen(m, leap) {
  return leap ? (m.leapDays ?? m.days) : m.days;
}

function baseLength(cal) {
  return cal.months.reduce((s, m) => s + m.days, 0);
}

function leapLength(cal) {
  return cal.months.reduce((s, m) => s + (m.leapDays ?? m.days), 0);
}

export function yearLength(cal, year) {
  return isLeap(cal, year) ? leapLength(cal) : baseLength(cal);
}

/** Number of leap years in [0, year). */
function leapsBefore(cal, year) {
  const n = cal.leapInterval;
  if (!n || year <= 0) return 0;
  return Math.floor((year - 1) / n) + 1;
}

export function daysBeforeYear(cal, year) {
  const y = Math.max(0, Math.floor(year));
  const leaps = leapsBefore(cal, y);
  return (y - leaps) * baseLength(cal) + leaps * leapLength(cal);
}

function dayToYear(cal, absDay) {
  let y = Math.max(0, Math.floor(absDay / Math.max(baseLength(cal), leapLength(cal))));
  while (daysBeforeYear(cal, y + 1) <= absDay) y++;
  return y;
}

/** Absolute seconds -> date parts. */
export function fromSeconds(cal, seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const absDay = Math.floor(s / DAY);
  const secondsOfDay = s - absDay * DAY;
  const year = dayToYear(cal, absDay);
  const leap = isLeap(cal, year);
  let rest = absDay - daysBeforeYear(cal, year);
  let monthIndex = 0;
  let day = 1;
  for (let i = 0; i < cal.months.length; i++) {
    const len = segLen(cal.months[i], leap);
    if (rest < len) {
      monthIndex = i;
      day = rest + 1;
      break;
    }
    rest -= len;
  }
  const month = cal.months[monthIndex];
  return {
    absDay,
    secondsOfDay,
    year,
    monthIndex,
    month,
    monthLength: segLen(month, leap),
    day,
    hour: Math.floor(secondsOfDay / 3600),
    minute: Math.floor((secondsOfDay % 3600) / 60),
    season: month.season,
    festival: !!month.festival
  };
}

/** Date parts -> absolute seconds. Out-of-range days are clamped. */
export function toSeconds(cal, { year, monthIndex, day, hour = 0, minute = 0 }) {
  const y = Math.max(0, Math.floor(Number(year) || 0));
  const mi = Math.min(Math.max(0, Math.floor(Number(monthIndex) || 0)), cal.months.length - 1);
  const leap = isLeap(cal, y);
  let d = daysBeforeYear(cal, y);
  for (let i = 0; i < mi; i++) d += segLen(cal.months[i], leap);
  const len = segLen(cal.months[mi], leap);
  d += Math.min(Math.max(1, Math.floor(Number(day) || 1)), Math.max(1, len)) - 1;
  const h = Math.min(Math.max(0, Math.floor(Number(hour) || 0)), 23);
  const m = Math.min(Math.max(0, Math.floor(Number(minute) || 0)), 59);
  return d * DAY + h * 3600 + m * 60;
}

/** Name of the part of the day for an hour 0-23. */
export function periodKey(hour) {
  if (hour === 0) return "midnight";
  if (hour < 5) return "lateNight";
  if (hour < 7) return "dawn";
  if (hour < 12) return "morning";
  if (hour === 12) return "noon";
  if (hour < 17) return "afternoon";
  if (hour < 19) return "dusk";
  if (hour < 21) return "evening";
  return "night";
}

/** True while the sun is down (used for icons only). */
export function isNight(hour) {
  return hour < 6 || hour >= 19;
}

/**
 * Moon phase at an absolute time.
 * @returns {{fraction:number, index:number, key:string}} fraction 0 = new, 0.5 = full
 */
export function moonPhase(moon, seconds) {
  const cycle = Math.max(1, Number(moon?.cycle) || 30);
  const offset = Number(moon?.offset) || 0;
  const days = seconds / DAY;
  let fraction = ((days - offset) / cycle) % 1;
  if (fraction < 0) fraction += 1;
  const index = Math.round(fraction * 8) % 8;
  return { fraction, index, key: MOON_PHASES[index] };
}

/** Offset that puts the moon in phase `index` (0-7) at `seconds`. */
export function moonOffsetFor(cycle, seconds, index) {
  return seconds / DAY - (index / 8) * cycle;
}

/** Selûne: full at midnight on 1 Hammer 1372 DR, 30 days 10.5 hours per cycle. */
export function defaultMoon() {
  const cycle = 30.4375;
  const cal = PRESETS.harptos;
  return { name: "Selûne", cycle, offset: daysBeforeYear(cal, 1372) - cycle / 2 };
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatTime(hour, minute, use24h = true) {
  if (use24h) return { hh: pad2(hour), mm: pad2(minute), suffix: "" };
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return { hh: String(h12), mm: pad2(minute), suffix: hour < 12 ? "AM" : "PM" };
}
