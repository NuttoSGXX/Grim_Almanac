/**
 * Grim Almanac — settings and shared state.
 *
 * The displayed date is   game.time.worldTime + timeOffset   read through the
 * active calendar. Setting the date only moves the offset, so it never expires
 * active effects by accident. Advancing time and resting move the real world
 * time, so effect durations keep up.
 */

import {
  PRESETS, clonePreset, sanitizeCalendar, fromSeconds, toSeconds, moonPhase, defaultMoon
} from "./calendar.js";
import { defaultWeather, rollWeather, currentTemp, diurnalOffset } from "./weather.js";
import { coreManaged, coreLiveTheme, fromCoreName } from "./core.js";

export const MODULE_ID = "grim-almanac";
export const SOCKET = `module.${MODULE_ID}`;
export const REFRESH_HOOK = "grimAlmanac.refresh";

export const THEMES = ["crimson", "ash", "amethyst", "sapphire"];

export const L = (key) => game.i18n.localize(`GRIMALMANAC.${key}`);
export const LF = (key, data) => game.i18n.format(`GRIMALMANAC.${key}`, data);

let calendarCache = null;

export function registerSettings() {
  const refresh = () => {
    calendarCache = null;
    Hooks.callAll(REFRESH_HOOK);
  };

  // ---- world state (edited through the Almanac settings window) ----
  game.settings.register(MODULE_ID, "calendar", {
    scope: "world", config: false, type: Object, default: clonePreset("harptos"), onChange: refresh
  });
  game.settings.register(MODULE_ID, "timeOffset", {
    scope: "world", config: false, type: Number,
    default: toSeconds(PRESETS.harptos, { year: 1492, monthIndex: 0, day: 1, hour: 8 }),
    onChange: refresh
  });
  game.settings.register(MODULE_ID, "weather", {
    scope: "world", config: false, type: Object, default: defaultWeather(), onChange: refresh
  });
  game.settings.register(MODULE_ID, "moon", {
    scope: "world", config: false, type: Object, default: defaultMoon(), onChange: refresh
  });

  // ---- world options ----
  game.settings.register(MODULE_ID, "showToPlayers", {
    name: "GRIMALMANAC.Settings.ShowToPlayers.Name",
    hint: "GRIMALMANAC.Settings.ShowToPlayers.Hint",
    scope: "world", config: true, type: Boolean, default: true, onChange: refresh
  });

  game.settings.register(MODULE_ID, "theme", {
    name: "GRIMALMANAC.Settings.Theme.Name",
    hint: "GRIMALMANAC.Settings.Theme.Hint",
    scope: "world", config: true, type: String, default: "crimson",
    choices: Object.fromEntries(THEMES.map((t) => [t, `GRIMALMANAC.Theme.${t}`])),
    onChange: () => {
      applyTheme();
      refresh();
    }
  });

  game.settings.register(MODULE_ID, "reverseDial", {
    name: "GRIMALMANAC.Settings.ReverseDial.Name",
    hint: "GRIMALMANAC.Settings.ReverseDial.Hint",
    scope: "world", config: true, type: Boolean, default: false, onChange: refresh
  });

  // ---- per-client options ----
  game.settings.register(MODULE_ID, "hudScale", {
    name: "GRIMALMANAC.Settings.Scale.Name",
    hint: "GRIMALMANAC.Settings.Scale.Hint",
    scope: "client", config: true, type: Number, default: 1,
    range: { min: 0.6, max: 1.5, step: 0.05 }, onChange: refresh
  });
  game.settings.register(MODULE_ID, "clock24", {
    name: "GRIMALMANAC.Settings.Clock24.Name",
    scope: "client", config: true, type: Boolean, default: true, onChange: refresh
  });
  game.settings.register(MODULE_ID, "tempUnit", {
    name: "GRIMALMANAC.Settings.TempUnit.Name",
    scope: "client", config: true, type: String, default: "C",
    choices: { C: "°C", F: "°F" }, onChange: refresh
  });
  game.settings.register(MODULE_ID, "hudPosition", {
    scope: "client", config: false, type: Object, default: {}
  });
}

/* ------------------------------ theme ------------------------------ */

export function getTheme() {
  const t = fromCoreName(game.settings.get(MODULE_ID, "theme"));
  return THEMES.includes(t) ? t : "crimson";
}

/** The stylesheet keys every colour off this attribute. */
export function applyTheme() {
  // While Grim Core is in charge, follow what it is showing (including its unsaved preview).
  document.body.dataset.gaTheme = coreLiveTheme() ?? getTheme();
}

export async function setTheme(theme) {
  theme = fromCoreName(theme);
  if (!game.user.isGM || !THEMES.includes(theme)) return;
  // Grim Core owns the theme while it is active; change it there so every Grim module stays in step.
  if (coreManaged()) return;
  await game.settings.set(MODULE_ID, "theme", theme);
}

/** +1 or -1: which way the dial turns as time moves forward. */
export function dialDirection() {
  return game.settings.get(MODULE_ID, "reverseDial") ? 1 : -1;
}

/* ------------------------------ readers ------------------------------ */

export function getCalendar() {
  if (!calendarCache) calendarCache = sanitizeCalendar(game.settings.get(MODULE_ID, "calendar"));
  return calendarCache;
}

export function getOffset() {
  return Number(game.settings.get(MODULE_ID, "timeOffset")) || 0;
}

/** Absolute calendar seconds right now. */
export function nowSeconds() {
  return Math.max(0, game.time.worldTime + getOffset());
}

export function getDate(seconds = nowSeconds()) {
  return fromSeconds(getCalendar(), seconds);
}

export function getWeather() {
  return { ...defaultWeather(), ...(game.settings.get(MODULE_ID, "weather") ?? {}) };
}

export function getMoon() {
  return { ...defaultMoon(), ...(game.settings.get(MODULE_ID, "moon") ?? {}) };
}

export function getMoonPhase(seconds = nowSeconds()) {
  return moonPhase(getMoon(), seconds);
}

export function getTempC(seconds = nowSeconds()) {
  const d = getDate(seconds);
  return currentTemp(getWeather(), d.secondsOfDay / 3600);
}

export function clientOptions() {
  return {
    use24h: !!game.settings.get(MODULE_ID, "clock24"),
    unit: game.settings.get(MODULE_ID, "tempUnit") === "F" ? "F" : "C",
    scale: Number(game.settings.get(MODULE_ID, "hudScale")) || 1
  };
}

/** Only one GM client should write shared state when several are connected. */
export function isPrimaryGM() {
  return game.user.isGM && (game.users.activeGM?.isSelf ?? true);
}

/* ------------------------------ writers (GM) ------------------------------ */

/** Jump the calendar to a date without touching world time. */
export async function setDateTime(parts) {
  if (!game.user.isGM) return;
  const target = toSeconds(getCalendar(), parts);
  await game.settings.set(MODULE_ID, "timeOffset", target - game.time.worldTime);
  await ensureWeather();
}

/** Move world time forward (or back) by a number of seconds. */
export async function advanceTime(seconds) {
  if (!game.user.isGM || !seconds) return;
  // Never let the calendar go below its first day.
  const delta = Math.max(seconds, -nowSeconds());
  if (delta) await game.time.advance(delta);
}

export async function setCalendar(cal) {
  if (!game.user.isGM) return;
  // Keep the same date on screen where the new calendar allows it.
  const before = getDate();
  const next = sanitizeCalendar(cal);
  await game.settings.set(MODULE_ID, "calendar", next);
  calendarCache = null;
  const target = toSeconds(next, {
    year: before.year,
    monthIndex: Math.min(before.monthIndex, next.months.length - 1),
    day: before.day, hour: before.hour, minute: before.minute
  });
  await game.settings.set(MODULE_ID, "timeOffset", target - game.time.worldTime);
  await ensureWeather();
}

export async function setMoon(moon) {
  if (!game.user.isGM) return;
  await game.settings.set(MODULE_ID, "moon", { ...getMoon(), ...moon });
}

/**
 * Save weather edits from the GM.
 * `tempC` is what the GM wants to read on the HUD right now; in automatic mode
 * it is stored as today's mean so the daily curve still passes through it.
 */
export async function setWeather({ auto, climate, tempC, condition }) {
  if (!game.user.isGM) return;
  const d = getDate();
  const next = { ...getWeather(), auto: !!auto, climate, condition, day: d.absDay };
  next.base = auto ? Math.round(tempC - diurnalOffset(climate, d.secondsOfDay / 3600)) : Math.round(tempC);
  await game.settings.set(MODULE_ID, "weather", next);
}

let rolling = false;

/** Roll new weather when the day has changed (automatic mode only). */
export async function ensureWeather(force = false) {
  if (rolling || !isPrimaryGM()) return;
  const w = getWeather();
  const d = getDate();
  if (!force && (!w.auto || w.day === d.absDay)) return;
  rolling = true;
  try {
    const rolled = rollWeather(w.climate, d.season);
    await game.settings.set(MODULE_ID, "weather", { ...w, ...rolled, day: d.absDay });
  } finally {
    rolling = false;
  }
}
