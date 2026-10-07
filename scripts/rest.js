/**
 * Grim Almanac — short and long rests.
 *
 * GM picks a rest under the HUD -> every connected client fades to black, the
 * dial lifts to the centre of the screen and winds forward -> the GM client
 * runs the dnd5e rest on the chosen characters and advances world time.
 */

import { DAY, periodKey, formatTime } from "./calendar.js";
import { SOCKET, L, LF, getDate, nowSeconds, clientOptions, dialDirection } from "./state.js";
import { dialMarkup, dialAngle, campfireMarkup, bandageMarkup } from "./art.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Animation timeline in milliseconds. */
function timeline(type) {
  return { dark: 1100, spinStart: 1700, spin: type === "short" ? 3200 : 4800, hold: 900, out: 1100 };
}

let resting = false;

/* -------------------------------------------------------------------------- */
/*  Popover under the HUD (GM)                                                */
/* -------------------------------------------------------------------------- */

function restCandidates() {
  return game.actors
    .filter((a) => a.type === "character" && a.hasPlayerOwner)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function closeRestPopover(hud) {
  hud.popSlot.replaceChildren();
}

export function openRestPopover(hud, type) {
  if (!game.user.isGM || resting) return;
  const already = hud.popSlot.querySelector(".ga-pop");
  if (already?.dataset.type === type) return closeRestPopover(hud);

  const actors = restCandidates();
  const isDnd = game.system.id === "dnd5e";
  const hoursBlock = type === "long"
    ? `<div class="ga-pop-hours">
         <span class="ga-pop-label">${L("Rest.HoursLabel")}</span>
         <div class="ga-chips">${[4, 6, 8, 10, 12, 24].map((h) => `<button type="button" class="ga-chip${h === 8 ? " is-on" : ""}" data-hours="${h}">${h}</button>`).join("")}</div>
         <input type="number" class="ga-hours" min="1" max="72" step="1" value="8" aria-label="${L("Rest.HoursLabel")}">
       </div>`
    : "";
  const actorBlock = !isDnd
    ? `<p class="ga-pop-note">${L("Rest.NoSystem")}</p>`
    : actors.length
      ? `<span class="ga-pop-label">${L("Rest.WhoRests")}</span>
         <div class="ga-pop-actors">${actors.map((a) => `<label><input type="checkbox" data-actor="${a.id}" checked><span>${esc(a.name)}</span></label>`).join("")}</div>`
      : `<p class="ga-pop-note">${L("Rest.NoActors")}</p>`;

  const pop = document.createElement("div");
  pop.className = "ga-pop";
  pop.dataset.type = type;
  pop.innerHTML = `
    <div class="ga-pop-title">${L(type === "short" ? "Rest.Short" : "Rest.Long")}</div>
    ${hoursBlock}
    <p class="ga-pop-until"></p>
    ${actorBlock}
    <div class="ga-pop-foot">
      <button type="button" class="ga-btn" data-pop="cancel">${L("Rest.Cancel")}</button>
      <button type="button" class="ga-btn ga-btn-primary" data-pop="begin">${L(type === "short" ? "Rest.BeginShort" : "Rest.BeginLong")}</button>
    </div>`;

  const input = pop.querySelector(".ga-hours");
  const hours = () => (type === "short" ? 1 : Math.min(72, Math.max(1, Math.round(Number(input.value) || 8))));
  const updateUntil = () => {
    const h = hours();
    const end = getDate(nowSeconds() + h * 3600);
    const t = formatTime(end.hour, end.minute, clientOptions().use24h);
    const time = `${t.hh}:${t.mm}${t.suffix ? ` ${t.suffix}` : ""}`;
    const date = end.festival && end.monthLength === 1 ? end.month.name : `${end.day} ${end.month.name}`;
    pop.querySelector(".ga-pop-until").textContent = LF(h === 1 ? "Rest.UntilOne" : "Rest.Until", { hours: h, time, date });
    for (const chip of pop.querySelectorAll(".ga-chip")) chip.classList.toggle("is-on", Number(chip.dataset.hours) === h);
  };
  input?.addEventListener("input", updateUntil);
  pop.addEventListener("click", (ev) => {
    const chip = ev.target.closest(".ga-chip");
    if (chip) {
      input.value = chip.dataset.hours;
      return updateUntil();
    }
    const action = ev.target.closest("[data-pop]")?.dataset.pop;
    if (action === "cancel") return closeRestPopover(hud);
    if (action === "begin") {
      const actorIds = [...pop.querySelectorAll("[data-actor]:checked")].map((n) => n.dataset.actor);
      const h = hours();
      closeRestPopover(hud);
      beginRest(hud, { type, hours: h, actorIds });
    }
  });
  updateUntil();
  hud.popSlot.replaceChildren(pop);
}

/* -------------------------------------------------------------------------- */
/*  Running the rest (GM)                                                     */
/* -------------------------------------------------------------------------- */

async function applyRests(type, actorIds) {
  if (game.system.id !== "dnd5e") return;
  for (const id of actorIds) {
    const actor = game.actors.get(id);
    if (!actor) continue;
    try {
      // advanceTime:false — this module moves the clock itself, once, for the whole party.
      if (type === "short") await actor.shortRest({ dialog: false, chat: true, advanceTime: false });
      else await actor.longRest({ dialog: false, chat: true, newDay: true, advanceTime: false });
    } catch (err) {
      console.error(`Grim Almanac | rest failed for ${actor.name}`, err);
      ui.notifications?.warn(LF("Rest.Failed", { name: actor.name }));
    }
  }
}

export async function beginRest(hud, { type, hours, actorIds = [] }) {
  if (!game.user.isGM || resting) return;
  resting = true;
  try {
    const h = type === "short" ? 1 : Math.min(72, Math.max(1, Math.round(hours) || 8));
    const payload = { type, hours: h, from: nowSeconds() };
    const T = timeline(type);
    game.socket.emit(SOCKET, { action: "rest", payload });
    const done = playRest(hud, payload);

    await sleep(T.dark);
    const worldBefore = game.time.worldTime;
    const started = performance.now();
    await applyRests(type, actorIds);
    // If the system already moved the clock for its own rest, only add the difference.
    const moved = Math.max(0, game.time.worldTime - worldBefore);
    const remaining = h * 3600 - moved;
    const wait = T.spinStart + T.spin - T.dark - (performance.now() - started);
    if (wait > 0) await sleep(wait);
    if (remaining > 0) await game.time.advance(remaining);
    await done;
  } finally {
    resting = false;
  }
}

/* -------------------------------------------------------------------------- */
/*  Overlay (every client)                                                    */
/* -------------------------------------------------------------------------- */

const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

export function playRest(hud, { type, hours, from }) {
  return new Promise((resolve) => {
    document.querySelector(".ga-rest-overlay")?.remove();
    const T = timeline(type);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const use24h = clientOptions().use24h;
    const to = from + hours * 3600;
    const startDate = getDate(from);
    const direction = dialDirection();
    const startAngle = dialAngle(startDate.secondsOfDay, direction);

    const overlay = document.createElement("div");
    overlay.className = `ga-rest-overlay ga-rest-${type}`;
    overlay.setAttribute("role", "status");
    overlay.innerHTML = `
      <div class="ga-rest-shade"></div>
      <div class="ga-rest-stage">
        <svg class="ga-rest-dial" viewBox="-98 -98 196 196" xmlns="http://www.w3.org/2000/svg">
          ${dialMarkup("gar", type === "short" ? bandageMarkup() : campfireMarkup())}
        </svg>
        <div class="ga-rest-caption">
          <div class="ga-rest-title">${L(type === "short" ? "Rest.Short" : "Rest.Long")}</div>
          <div class="ga-rest-clock"><span class="ga-rest-time"></span><span class="ga-rest-suffix"></span></div>
          <div class="ga-rest-sub"><span class="ga-rest-period"></span><span class="ga-rest-dot"></span><span>${LF(hours === 1 ? "Rest.PassOne" : "Rest.Pass", { hours })}</span></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const dial = overlay.querySelector(".ga-rest-dial");
    const disc = dial.querySelector(".ga-dial-disc");
    const timeEl = overlay.querySelector(".ga-rest-time");
    const suffixEl = overlay.querySelector(".ga-rest-suffix");
    const periodEl = overlay.querySelector(".ga-rest-period");

    const show = (seconds) => {
      const d = getDate(seconds);
      const t = formatTime(d.hour, d.minute, use24h);
      timeEl.textContent = `${t.hh}:${t.mm}`;
      suffixEl.textContent = t.suffix;
      periodEl.textContent = L(`Period.${periodKey(d.hour)}`);
      disc.style.transform = `rotate(${(startAngle + direction * ((seconds - from) / DAY) * 360).toFixed(2)}deg)`;
    };
    show(from);

    // Start the big dial exactly on top of the HUD dial, then let it travel to the centre.
    const flight = () => {
      const src = hud?.dialRect();
      const dst = dial.getBoundingClientRect();
      if (!src || !dst.width) return "scale(0.6)";
      const dx = src.left + src.width / 2 - (dst.left + dst.width / 2);
      const dy = src.top + src.height / 2 - (dst.top + dst.height / 2);
      return `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${(src.width / dst.width).toFixed(4)})`;
    };
    const home = flight();
    const fromHud = home.startsWith("translate");
    dial.style.transition = "none";
    dial.style.transform = home;
    dial.style.opacity = fromHud ? "1" : "0";
    hud?.setResting(true);
    void dial.getBoundingClientRect();
    dial.style.transition = "";

    requestAnimationFrame(() => {
      overlay.classList.add("ga-in");
      dial.style.transform = "";
      dial.style.opacity = "1";
    });

    // Wind the clock forward.
    setTimeout(() => {
      if (reduce) return show(to);
      const t0 = performance.now();
      const frame = (now) => {
        if (!overlay.isConnected) return;
        const p = Math.min(1, (now - t0) / T.spin);
        show(from + (to - from) * ease(p));
        if (p < 1) requestAnimationFrame(frame);
        else show(to);
      };
      requestAnimationFrame(frame);
    }, T.spinStart);

    // Send the dial home and lift the dark.
    setTimeout(() => {
      show(to);
      overlay.classList.add("ga-out");
      dial.style.transform = flight();
      if (!fromHud) dial.style.opacity = "0";
    }, T.spinStart + T.spin + T.hold);

    setTimeout(() => {
      hud?.setResting(false);
      overlay.remove();
      resolve();
    }, T.spinStart + T.spin + T.hold + T.out);
  });
}
