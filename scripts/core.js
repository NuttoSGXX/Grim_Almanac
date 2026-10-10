/**
 * Grim Almanac — bridge to Grim Core (the shared theme hub for the Grim modules).
 *
 * Grim Core themes this module in two ways:
 *   1. it writes this module's own "theme" setting (its "abyss" is our "sapphire");
 *   2. for a custom colour it overrides the --ga-* tokens from its own <style> element.
 * Both already work with the plain stylesheet. This file adds the parts only this
 * module can do: stepping back from its own theme switch while the hub is in
 * charge, and following the hub's live preview before the GM presses Apply.
 *
 * Everything here is optional: without Grim Core the functions report "not managed"
 * and the module behaves exactly as it does on its own.
 */

export const CORE_ID = "grim-core";
const SELF_ID = "grim-almanac";

/** Hub preset -> the key this module uses for the same theme. */
const FROM_CORE = { crimson: "crimson", ash: "ash", amethyst: "amethyst", abyss: "sapphire" };

function coreModule() {
  const mod = game.modules?.get(CORE_ID);
  return mod?.active ? mod : null;
}

/** The hub's saved theme, or null when Grim Core is not running. */
export function coreTheme() {
  const mod = coreModule();
  if (!mod) return null;
  try {
    return mod.api?.getTheme?.() ?? game.settings.get(CORE_ID, "theme") ?? null;
  } catch (_) {
    return null; // its setting is not registered yet
  }
}

/** True while Grim Core decides this module's colours. */
export function coreManaged() {
  const theme = coreTheme();
  if (!theme) return false;
  return !(Array.isArray(theme.off) && theme.off.includes(SELF_ID));
}

/** Accept either module's name for a theme ("abyss" and "sapphire" are the same one). */
export function fromCoreName(name) {
  return FROM_CORE[name] ?? name;
}

/**
 * The built-in theme the hub is showing right now, in this module's naming.
 * The hub marks <body data-grim-core="..."> on every change, including the
 * unsaved draft in its panel. Null for a custom colour (its base arrives through
 * our own setting) and whenever the hub is not in charge.
 */
export function coreLiveTheme() {
  if (!coreManaged()) return null;
  return FROM_CORE[document.body.dataset.grimCore] ?? null;
}

/** Label of what the hub is set to, for the "managed by" note. */
export function coreThemeLabel() {
  const preset = coreTheme()?.preset;
  if (!preset) return "";
  const key = `GRIMCORE.Preset.${preset}`;
  const label = game.i18n.localize(key);
  return label === key ? preset : label;
}

export function openCore() {
  coreModule()?.api?.open?.();
}

/** Re-run `callback` whenever the hub changes what it shows. */
export function watchCore(callback) {
  if (!coreModule()) return;
  new MutationObserver(callback).observe(document.body, { attributes: true, attributeFilter: ["data-grim-core"] });
}
