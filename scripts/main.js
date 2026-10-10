/**
 * Grim Almanac — entry point.
 */

import {
  MODULE_ID, SOCKET, REFRESH_HOOK, registerSettings, applyTheme, ensureWeather, getDate, nowSeconds, advanceTime, setDateTime
} from "./state.js";
import { AlmanacHUD } from "./hud.js";
import { AlmanacConfig } from "./config.js";
import { openRestPopover, beginRest, playRest } from "./rest.js";
import { coreManaged, coreThemeLabel, watchCore } from "./core.js";

let hud = null;
let config = null;

function openConfig() {
  if (!game.user.isGM) return;
  config ??= new AlmanacConfig();
  config.render({ force: true });
}

Hooks.once("init", () => {
  registerSettings();
  game.settings.registerMenu(MODULE_ID, "config", {
    name: "GRIMALMANAC.Config.Title",
    label: "GRIMALMANAC.Config.Open",
    hint: "GRIMALMANAC.Config.MenuHint",
    icon: "fa-solid fa-moon",
    type: AlmanacConfig,
    restricted: true
  });
});

Hooks.once("ready", () => {
  applyTheme();
  // Grim Core (optional): follow its theme and its live preview.
  watchCore(() => {
    applyTheme();
    if (config?.rendered) config.render();
  });
  hud = new AlmanacHUD({
    onRest: (type) => openRestPopover(hud, type),
    onConfig: openConfig
  });
  hud.build();

  game.socket.on(SOCKET, (message) => {
    if (message?.action === "rest" && message.payload) playRest(hud, message.payload);
  });

  // Small public surface for macros and other modules.
  game.modules.get(MODULE_ID).api = {
    hud,
    openConfig,
    /** True while Grim Core (the shared Grim theme hub) decides this module's colours. */
    themeManagedByCore: coreManaged,
    getDate,
    nowSeconds,
    advanceTime,
    setDateTime,
    rest: (type = "short", hours = 8, actorIds) =>
      beginRest(hud, {
        type,
        hours,
        actorIds: actorIds ?? game.actors.filter((a) => a.type === "character" && a.hasPlayerOwner).map((a) => a.id)
      })
  };

  ensureWeather();
});

Hooks.on("updateWorldTime", () => {
  hud?.refresh();
  ensureWeather();
});

Hooks.on(REFRESH_HOOK, () => hud?.refresh());

// Grim Core keeps this module's theme setting in step with every other Grim module,
// so the switch in Configure Settings is locked while it is in charge.
Hooks.on("renderSettingsConfig", (app, html) => {
  if (!coreManaged()) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const select = root?.querySelector?.(`select[name="${MODULE_ID}.theme"]`);
  if (!select) return;
  select.disabled = true;
  const note = document.createElement("p");
  note.className = "hint ga-core-hint";
  note.textContent = game.i18n.format("GRIMALMANAC.Core.Managed", { theme: coreThemeLabel() });
  (select.closest(".form-group") ?? select.parentElement)?.append(note);
});
