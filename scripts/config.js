/**
 * Grim Almanac — GM settings window (date, weather, calendar).
 */

import { PRESETS, SEASONS, MOON_PHASES, clonePreset, formatTime } from "./calendar.js";
import { CLIMATES, CONDITIONS, toUnit, fromUnit } from "./weather.js";
import {
  MODULE_ID, REFRESH_HOOK, THEMES, L, getTheme, setTheme, getCalendar, getDate, getWeather, getMoon, getMoonPhase, getTempC,
  nowSeconds, clientOptions, setDateTime, advanceTime, setCalendar, setMoon, setWeather, ensureWeather
} from "./state.js";
import { moonOffsetFor } from "./calendar.js";

const { ApplicationV2 } = foundry.applications.api;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const opt = (value, label, selected) => `<option value="${esc(value)}"${selected ? " selected" : ""}>${esc(label)}</option>`;

export class AlmanacConfig extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "grim-almanac-config",
    classes: ["grim-almanac-config"],
    window: { title: "GRIMALMANAC.Config.Title", icon: "fa-solid fa-moon", resizable: true },
    position: { width: 560, height: "auto" }
  };

  #tab = "date";
  #draft = null;
  #hook = null;

  /* ------------------------------ rendering ------------------------------ */

  async _renderHTML() {
    const root = document.createElement("div");
    root.className = "ga-config";
    const tabs = ["date", "weather", "calendar"];
    root.innerHTML = `
      <p class="ga-config-now" data-now></p>
      <nav class="ga-config-tabs">
        ${tabs.map((t) => `<button type="button" data-tab="${t}" class="${t === this.#tab ? "is-on" : ""}">${L(`Config.Tab.${t}`)}</button>`).join("")}
      </nav>
      <section data-panel="date"${this.#tab === "date" ? "" : " hidden"}>${this.#dateTab()}</section>
      <section data-panel="weather"${this.#tab === "weather" ? "" : " hidden"}>${this.#weatherTab()}</section>
      <section data-panel="calendar"${this.#tab === "calendar" ? "" : " hidden"}>${this.#calendarTab()}</section>`;
    return root;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  _onRender() {
    const root = this.element.querySelector(".ga-config");
    if (!root) return;
    root.addEventListener("click", (ev) => this.#onClick(ev, root));
    root.addEventListener("change", (ev) => this.#onChange(ev, root));
    this.#updateNow();
    if (this.#hook === null) this.#hook = Hooks.on(REFRESH_HOOK, () => this.#updateNow());
  }

  _onClose(options) {
    if (this.#hook !== null) Hooks.off(REFRESH_HOOK, this.#hook);
    this.#hook = null;
    this.#draft = null;
    return super._onClose?.(options);
  }

  #updateNow() {
    const node = this.element?.querySelector("[data-now]");
    if (!node) return;
    const d = getDate();
    const cal = getCalendar();
    const t = formatTime(d.hour, d.minute, clientOptions().use24h);
    const date = d.festival && d.monthLength === 1 ? d.month.name : `${d.day} ${d.month.name}`;
    node.textContent = `${date}, ${d.year}${cal.era ? ` ${cal.era}` : ""} — ${t.hh}:${t.mm}${t.suffix ? ` ${t.suffix}` : ""}`;
  }

  /* ------------------------------ tabs ------------------------------ */

  #dateTab() {
    const d = getDate();
    const cal = getCalendar();
    const moon = getMoon();
    const phase = getMoonPhase();
    const steps = [
      [-86400, "−1d"], [-3600, "−1h"], [-600, "−10m"], [600, "+10m"], [3600, "+1h"], [28800, "+8h"], [86400, "+1d"]
    ];
    return `
      <fieldset>
        <legend>${L("Config.SetDate")}</legend>
        <div class="ga-grid ga-grid-date">
          <label>${L("Config.Day")}<input type="number" name="day" min="1" max="99" value="${d.day}"></label>
          <label>${L("Config.Month")}<select name="monthIndex">${cal.months.map((m, i) => opt(i, m.festival ? `✦ ${m.name}` : m.name, i === d.monthIndex)).join("")}</select></label>
          <label>${L("Config.Year")}<input type="number" name="year" min="0" value="${d.year}"></label>
          <label>${L("Config.Hour")}<input type="number" name="hour" min="0" max="23" value="${d.hour}"></label>
          <label>${L("Config.Minute")}<input type="number" name="minute" min="0" max="59" value="${d.minute}"></label>
        </div>
        <p class="ga-hint">${L("Config.SetDateHint")}</p>
        <button type="button" class="ga-btn ga-btn-primary" data-do="setDate">${L("Config.SetDateButton")}</button>
      </fieldset>
      <fieldset>
        <legend>${L("Config.Advance")}</legend>
        <div class="ga-steps">${steps.map(([s, label]) => `<button type="button" class="ga-btn" data-do="advance" data-seconds="${s}">${label}</button>`).join("")}</div>
        <p class="ga-hint">${L("Config.AdvanceHint")}</p>
      </fieldset>
      <fieldset>
        <legend>${L("Config.Moon")}</legend>
        <div class="ga-grid ga-grid-3">
          <label>${L("Config.MoonName")}<input type="text" name="moonName" value="${esc(moon.name)}"></label>
          <label>${L("Config.MoonCycle")}<input type="number" name="moonCycle" min="1" step="0.0001" value="${moon.cycle}"></label>
          <label>${L("Config.MoonPhase")}<select name="moonPhase">${MOON_PHASES.map((k, i) => opt(i, L(`Moon.${k}`), i === phase.index)).join("")}</select></label>
        </div>
        <button type="button" class="ga-btn ga-btn-primary" data-do="setMoon">${L("Config.MoonButton")}</button>
      </fieldset>
      <fieldset>
        <legend>${L("Config.Display")}</legend>
        <div class="ga-grid ga-grid-3">
          <label>${L("Config.Theme")}<select name="theme">${THEMES.map((t) => opt(t, L(`Theme.${t}`), t === getTheme())).join("")}</select></label>
        </div>
        <button type="button" class="ga-btn" data-do="resetPosition">${L("Config.ResetPosition")}</button>
        <p class="ga-hint">${L("Config.DisplayHint")}</p>
      </fieldset>`;
  }

  #weatherTab() {
    const w = getWeather();
    const unit = clientOptions().unit;
    return `
      <fieldset>
        <legend>${L("Config.Weather")}</legend>
        <label class="ga-check"><input type="checkbox" name="auto"${w.auto ? " checked" : ""}><span>${L("Config.WeatherAuto")}</span></label>
        <p class="ga-hint">${L("Config.WeatherAutoHint")}</p>
        <div class="ga-grid ga-grid-3">
          <label>${L("Config.Climate")}<select name="climate">${Object.keys(CLIMATES).map((k) => opt(k, L(`Climate.${k}`), k === w.climate)).join("")}</select></label>
          <label>${L("Config.Temperature")} (°${unit})<input type="number" name="temp" step="1" value="${toUnit(getTempC(), unit)}"></label>
          <label>${L("Config.Condition")}<select name="condition">${CONDITIONS.map((k) => opt(k, L(`Weather.${k}`), k === w.condition)).join("")}</select></label>
        </div>
        <div class="ga-steps">
          <button type="button" class="ga-btn ga-btn-primary" data-do="setWeather">${L("Config.WeatherButton")}</button>
          <button type="button" class="ga-btn" data-do="reroll">${L("Config.Reroll")}</button>
        </div>
      </fieldset>`;
  }

  #calendarTab() {
    const cal = this.#draft ?? JSON.parse(JSON.stringify(getCalendar()));
    this.#draft = cal;
    const presets = [["harptos", L("Config.PresetHarptos")], ["gregorian", L("Config.PresetGregorian")], ["custom", L("Config.PresetCustom")]];
    const rows = cal.months.map((m, i) => `
      <tr data-row="${i}">
        <td><input type="text" data-f="name" value="${esc(m.name)}"></td>
        <td><input type="number" data-f="days" min="0" max="999" value="${m.days}"></td>
        <td><input type="number" data-f="leapDays" min="0" max="999" value="${m.leapDays ?? m.days}"></td>
        <td><select data-f="season">${SEASONS.map((s) => opt(s, L(`Season.${s}`), s === m.season)).join("")}</select></td>
        <td class="ga-center"><input type="checkbox" data-f="festival"${m.festival ? " checked" : ""}></td>
        <td><button type="button" class="ga-btn ga-btn-icon" data-do="removeMonth" data-index="${i}" aria-label="${L("Config.RemoveMonth")}" data-tooltip="${L("Config.RemoveMonth")}"><i class="fa-solid fa-xmark" inert></i></button></td>
      </tr>`).join("");
    return `
      <fieldset>
        <legend>${L("Config.Calendar")}</legend>
        <div class="ga-grid ga-grid-3">
          <label>${L("Config.Preset")}<select name="preset">${presets.map(([k, label]) => opt(k, label, (cal.preset ?? "custom") === k)).join("")}</select></label>
          <label>${L("Config.Era")}<input type="text" name="era" value="${esc(cal.era)}"></label>
          <label>${L("Config.LeapInterval")}<input type="number" name="leapInterval" min="0" value="${cal.leapInterval}"></label>
        </div>
        <div class="ga-table-wrap">
          <table class="ga-months">
            <thead><tr><th>${L("Config.MonthName")}</th><th>${L("Config.Days")}</th><th>${L("Config.LeapDays")}</th><th>${L("Config.SeasonCol")}</th><th>${L("Config.Festival")}</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="ga-hint">${L("Config.CalendarHint")}</p>
        <div class="ga-steps">
          <button type="button" class="ga-btn" data-do="addMonth">${L("Config.AddMonth")}</button>
          <button type="button" class="ga-btn ga-btn-primary" data-do="saveCalendar">${L("Config.SaveCalendar")}</button>
        </div>
      </fieldset>`;
  }

  /* ------------------------------ events ------------------------------ */

  #val(root, name) {
    const node = root.querySelector(`[name="${name}"]`);
    if (!node) return undefined;
    return node.type === "checkbox" ? node.checked : node.value;
  }

  /** Pull the calendar table back into the draft. */
  #readDraft(root) {
    if (!this.#draft) return;
    this.#draft.era = String(this.#val(root, "era") ?? "");
    this.#draft.leapInterval = Number(this.#val(root, "leapInterval")) || 0;
    this.#draft.preset = this.#val(root, "preset") ?? "custom";
    for (const tr of root.querySelectorAll("tr[data-row]")) {
      const m = this.#draft.months[Number(tr.dataset.row)];
      if (!m) continue;
      m.name = tr.querySelector('[data-f="name"]').value;
      m.days = Number(tr.querySelector('[data-f="days"]').value) || 0;
      m.leapDays = Number(tr.querySelector('[data-f="leapDays"]').value) || 0;
      m.season = tr.querySelector('[data-f="season"]').value;
      m.festival = tr.querySelector('[data-f="festival"]').checked;
    }
  }

  #onChange(ev, root) {
    const target = ev.target;
    if (target.name === "theme") return setTheme(target.value);
    if (target.name === "preset") {
      if (target.value !== "custom" && PRESETS[target.value]) {
        this.#draft = clonePreset(target.value);
        return this.render();
      }
      return;
    }
    // Any edit to the table makes it a custom calendar.
    if (target.closest(".ga-months") || target.name === "leapInterval") {
      const preset = root.querySelector('[name="preset"]');
      if (preset) preset.value = "custom";
    }
  }

  async #onClick(ev, root) {
    const tab = ev.target.closest("[data-tab]")?.dataset.tab;
    if (tab) {
      this.#readDraft(root);
      this.#tab = tab;
      for (const b of root.querySelectorAll("[data-tab]")) b.classList.toggle("is-on", b.dataset.tab === tab);
      for (const p of root.querySelectorAll("[data-panel]")) p.hidden = p.dataset.panel !== tab;
      return;
    }
    const button = ev.target.closest("[data-do]");
    if (!button) return;
    switch (button.dataset.do) {
      case "setDate":
        await setDateTime({
          year: this.#val(root, "year"), monthIndex: this.#val(root, "monthIndex"), day: this.#val(root, "day"),
          hour: this.#val(root, "hour"), minute: this.#val(root, "minute")
        });
        return this.render();
      case "advance":
        await advanceTime(Number(button.dataset.seconds));
        return this.render();
      case "setMoon": {
        const cycle = Math.max(1, Number(this.#val(root, "moonCycle")) || 30);
        await setMoon({
          name: String(this.#val(root, "moonName") || "Moon"),
          cycle,
          offset: moonOffsetFor(cycle, nowSeconds(), Number(this.#val(root, "moonPhase")) || 0)
        });
        return this.render();
      }
      case "resetPosition":
        return game.modules.get(MODULE_ID)?.api?.hud?.resetPosition();
      case "setWeather": {
        const unit = clientOptions().unit;
        await setWeather({
          auto: !!this.#val(root, "auto"),
          climate: this.#val(root, "climate"),
          tempC: fromUnit(Number(this.#val(root, "temp")) || 0, unit),
          condition: this.#val(root, "condition")
        });
        return this.render();
      }
      case "reroll": {
        const w = getWeather();
        await game.settings.set(MODULE_ID, "weather", { ...w, climate: this.#val(root, "climate") ?? w.climate });
        await ensureWeather(true);
        return this.render();
      }
      case "addMonth":
        this.#readDraft(root);
        this.#draft.months.push({ name: L("Config.NewMonth"), days: 30, leapDays: 30, season: "spring", festival: false });
        this.#draft.preset = "custom";
        return this.render();
      case "removeMonth":
        this.#readDraft(root);
        if (this.#draft.months.length > 1) this.#draft.months.splice(Number(button.dataset.index), 1);
        this.#draft.preset = "custom";
        return this.render();
      case "saveCalendar":
        this.#readDraft(root);
        await setCalendar(this.#draft);
        this.#draft = null;
        ui.notifications?.info(L("Config.CalendarSaved"));
        return this.render();
    }
  }
}
