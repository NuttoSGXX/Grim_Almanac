/**
 * Grim Almanac — the on-screen date / time / weather display.
 */

import { DAY, periodKey, isNight, formatTime } from "./calendar.js";
import { tempBand, toUnit } from "./weather.js";
import {
  MODULE_ID, L, getCalendar, getDate, getWeather, getMoon, getMoonPhase, getTempC,
  clientOptions, advanceTime, nowSeconds, dialDirection
} from "./state.js";
import { hudMarkup, dialAngle, moonIcon, SEASON_ICONS, WEATHER_ICONS } from "./art.js";

const BASE_WIDTH = 520;

export class AlmanacHUD {
  constructor({ onRest, onConfig }) {
    this.onRest = onRest;
    this.onConfig = onConfig;
    this.el = null;
    this.refs = {};
    this.texts = {};
    this.angle = null;
    this.lastNow = null;
    this.direction = null;
    this.first = true;
  }

  /* ------------------------------ build ------------------------------ */

  build() {
    if (this.el) return;
    const el = document.createElement("div");
    el.id = "grim-almanac-hud";
    el.className = "ga-hud";
    el.innerHTML = `<div class="ga-hud-frame">${hudMarkup()}</div>${game.user.isGM ? this.#controlsMarkup() : ""}<div class="ga-pop-slot"></div>`;
    document.body.appendChild(el);
    this.el = el;

    for (const node of el.querySelectorAll("[data-ga]")) this.refs[node.dataset.ga] = node;
    this.refs.disc = el.querySelector(".ga-dial-disc");
    this.refs.dial = el.querySelector(".ga-dial");
    this.refs.svg = el.querySelector(".ga-svg");
    this.popSlot = el.querySelector(".ga-pop-slot");

    this.#bindDrag(el.querySelector(".ga-hud-frame"));
    el.querySelector(".ga-controls")?.addEventListener("click", (ev) => this.#onControl(ev));
    window.addEventListener("resize", () => this.#applyPosition());
    document.fonts?.ready?.then(() => this.#layoutRows());

    this.refresh();
    this.#applyPosition();
  }

  #controlsMarkup() {
    const btn = (action, icon, label, tip, extra = "") =>
      `<button type="button" class="ga-btn ${extra}" data-action="${action}" data-tooltip="${tip}" aria-label="${tip}">${icon ? `<i class="${icon}" inert></i>` : ""}${label ? `<span>${label}</span>` : ""}</button>`;
    return `
      <div class="ga-controls">
        ${btn("minus10", "", "−10m", L("Controls.Back10"))}
        ${btn("plus10", "", "+10m", L("Controls.Forward10"))}
        ${btn("plus60", "", "+1h", L("Controls.Forward60"))}
        <span class="ga-sep"></span>
        ${btn("short", "fa-solid fa-bandage", L("Rest.Short"), L("Controls.ShortTip"), "ga-btn-rest")}
        ${btn("long", "fa-solid fa-fire", L("Rest.Long"), L("Controls.LongTip"), "ga-btn-rest")}
        <span class="ga-sep"></span>
        ${btn("config", "fa-solid fa-gear", "", L("Controls.Settings"))}
      </div>`;
  }

  #onControl(ev) {
    const action = ev.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    switch (action) {
      case "minus10": return advanceTime(-600);
      case "plus10": return advanceTime(600);
      case "plus60": return advanceTime(3600);
      case "short": return this.onRest?.("short");
      case "long": return this.onRest?.("long");
      case "config": return this.onConfig?.();
    }
  }

  /* ------------------------------ position ------------------------------ */

  #bindDrag(handle) {
    let start = null;
    const move = (ev) => {
      if (!start) return;
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!start.moved && Math.hypot(dx, dy) < 4) return;
      start.moved = true;
      this.el.classList.add("ga-dragging");
      this.#place(start.left + dx, start.top + dy);
    };
    const end = () => {
      if (!start) return;
      const moved = start.moved;
      start = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      this.el.classList.remove("ga-dragging");
      if (moved) {
        const rect = this.el.getBoundingClientRect();
        game.settings.set(MODULE_ID, "hudPosition", { left: Math.round(rect.left), top: Math.round(rect.top) });
      }
    };
    handle.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      const rect = this.el.getBoundingClientRect();
      start = { x: ev.clientX, y: ev.clientY, left: rect.left, top: rect.top, moved: false };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    });
    handle.addEventListener("dblclick", () => this.resetPosition());
  }

  #place(left, top) {
    const w = this.el.offsetWidth;
    const maxLeft = Math.max(0, window.innerWidth - w);
    const maxTop = Math.max(0, window.innerHeight - 60);
    this.el.style.left = `${Math.min(Math.max(0, left), maxLeft)}px`;
    this.el.style.top = `${Math.min(Math.max(0, top), maxTop)}px`;
  }

  #applyPosition() {
    if (!this.el) return;
    const pos = game.settings.get(MODULE_ID, "hudPosition") ?? {};
    if (Number.isFinite(pos.left) && Number.isFinite(pos.top)) this.#place(pos.left, pos.top);
    else this.#place((window.innerWidth - this.el.offsetWidth) / 2, 10);
  }

  async resetPosition() {
    await game.settings.set(MODULE_ID, "hudPosition", {});
    this.#applyPosition();
  }

  /** Screen rectangle of the dial, used by the rest overlay. */
  dialRect() {
    if (!this.el || this.el.hidden) return null;
    return this.el.querySelector(".ga-dial-rim")?.getBoundingClientRect() ?? null;
  }

  setResting(on) {
    this.el?.classList.toggle("ga-resting", !!on);
  }

  /* ------------------------------ refresh ------------------------------ */

  #text(key, value) {
    const node = this.refs[key];
    const str = String(value ?? "");
    if (!node || this.texts[key] === str) return false;
    this.texts[key] = str;
    node.textContent = str;
    if (!this.first) {
      const host = node.closest("text") ?? node;
      host.classList.remove("ga-changed");
      void host.getBoundingClientRect();
      host.classList.add("ga-changed");
    }
    return true;
  }

  #icon(key, id, markup) {
    const node = this.refs[key];
    if (!node || this.texts[key] === id) return;
    this.texts[key] = id;
    node.innerHTML = markup;
  }

  /** Centre an icon + label pair on the row's centre line. */
  #layoutRows() {
    if (!this.el) return;
    for (const row of this.el.querySelectorAll(".ga-row")) {
      const cx = Number(row.dataset.cx);
      const gap = Number(row.dataset.gap ?? 6);
      const icon = row.querySelector(".ga-icon");
      const text = row.querySelector("text");
      const iconW = 16;
      let len = 0;
      try { len = text.getComputedTextLength(); } catch (_) { /* not laid out yet */ }
      const total = iconW + gap + len;
      const left = cx - total / 2;
      const y = Number(text.getAttribute("y")) - 4.5;
      icon.setAttribute("transform", `translate(${(left + iconW / 2).toFixed(1)},${y})`);
      text.setAttribute("x", (left + iconW + gap + len / 2).toFixed(1));
    }
  }

  refresh() {
    if (!this.el) return;
    const visible = game.user.isGM || game.settings.get(MODULE_ID, "showToPlayers");
    this.el.hidden = !visible;
    if (!visible) return;

    const opts = clientOptions();
    this.el.style.setProperty("--ga-width", `${Math.round(BASE_WIDTH * opts.scale)}px`);

    const now = nowSeconds();
    const d = getDate(now);
    const cal = getCalendar();
    const weather = getWeather();
    const night = isNight(d.hour);

    // date
    const oneDayFestival = d.festival && d.monthLength === 1;
    this.#text("day", oneDayFestival ? "" : d.day);
    this.refs.festivalMark.style.display = oneDayFestival ? "" : "none";
    this.#text("month", d.month.name);
    this.#text("season", L(`Season.${d.season}`));
    this.#icon("seasonIcon", d.season, SEASON_ICONS[d.season]);
    this.#text("year", `${d.year} ${cal.era}`.trim());

    // time
    const t = formatTime(d.hour, d.minute, opts.use24h);
    this.#text("hh", t.hh);
    this.#text("mm", t.mm);
    this.#text("suffix", t.suffix);
    const period = L(`Period.${periodKey(d.hour)}`);
    this.#text("period", period);

    // temperature and weather
    const c = getTempC(now);
    this.#text("temp", `${String(toUnit(c, opts.unit)).replace("-", "−")}°`);
    this.#text("unit", opts.unit);
    this.#text("band", L(`Temp.${tempBand(c)}`));
    const level = Math.min(1, Math.max(0.04, (c + 20) / 62));
    this.refs.mercury.style.transform = `scaleY(${level.toFixed(3)})`;
    const cond = weather.condition;
    const iconId = cond === "clear" && night ? "clearNight" : cond;
    this.#text("weather", L(`Weather.${cond}`));
    this.#icon("weatherIcon", iconId, WEATHER_ICONS[iconId] ?? WEATHER_ICONS.clear);

    // moon
    const phase = getMoonPhase(now);
    this.#text("moon", L(`Moon.${phase.key}`));
    this.#icon("moonIcon", `moon-${Math.round(phase.fraction * 48)}`, moonIcon(phase.fraction));

    // dial: time moving forward always turns it the same way, however big the jump;
    // only going back in time turns it the other way.
    const direction = dialDirection();
    if (this.angle === null || this.direction !== direction) this.angle = dialAngle(d.secondsOfDay, direction);
    else {
      const turn = direction * ((now - this.lastNow) / DAY) * 360;
      this.angle += Math.sign(turn) * (Math.abs(turn) % 360);
    }
    this.lastNow = now;
    this.direction = direction;
    this.refs.disc.style.transform = `rotate(${this.angle.toFixed(2)}deg)`;
    this.el.classList.toggle("ga-night", night);

    const era = cal.era ? ` ${cal.era}` : "";
    const dateStr = oneDayFestival ? d.month.name : `${d.day} ${d.month.name}`;
    this.refs.svg.setAttribute(
      "aria-label",
      `${dateStr} ${d.year}${era}, ${t.hh}:${t.mm}${t.suffix ? ` ${t.suffix}` : ""} (${period}). ${toUnit(c, opts.unit)}°${opts.unit}, ${L(`Weather.${cond}`)}. ${getMoon().name}: ${L(`Moon.${phase.key}`)}.`
    );

    this.#layoutRows();
    this.first = false;
  }
}
