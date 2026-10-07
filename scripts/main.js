/**
 * Grim Almanac — entry point.
 */

import {
  MODULE_ID, SOCKET, REFRESH_HOOK, registerSettings, ensureWeather, getDate, nowSeconds, advanceTime, setDateTime
} from "./state.js";
import { AlmanacHUD } from "./hud.js";
import { AlmanacConfig } from "./config.js";
import { openRestPopover, beginRest, playRest } from "./rest.js";

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
