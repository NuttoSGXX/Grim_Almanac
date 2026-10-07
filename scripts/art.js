/**
 * Grim Almanac — vector art.
 * Everything on screen is inline SVG built here, so the module ships no images.
 * To reskin later, replace these builders (or lay images over them in CSS).
 */

const f = (n) => Number(n.toFixed(2));

/* -------------------------------------------------------------------------- */
/*  Metal sheen                                                               */
/* -------------------------------------------------------------------------- */

/** One sweep of reflected light every SHEEN.period seconds, lasting SHEEN.sweep of that. */
const SHEEN = { period: 6.5, sweep: 0.3 };

/**
 * A slanted band of light that travels from x = `from` to x = `to` and then waits.
 * Lines stroked with it look like polished metal catching a light.
 * @param {string} id     gradient id
 * @param {number} from   start x of the band (user units of the lines it paints)
 * @param {number} to     end x
 * @param {number} scale  size of the band, for art drawn at another scale
 */
function sheenGradient(id, from, to, scale = 1) {
  const w = f(110 * scale);
  const h = f(46 * scale);
  return `
      <linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${w}" y2="${h}">
        <stop offset="0" style="stop-color:var(--ga-glint)" stop-opacity="0"/>
        <stop offset="0.35" style="stop-color:var(--ga-glint)" stop-opacity="0.15"/>
        <stop offset="0.5" style="stop-color:var(--ga-glint)" stop-opacity="1"/>
        <stop offset="0.65" style="stop-color:var(--ga-glint)" stop-opacity="0.15"/>
        <stop offset="1" style="stop-color:var(--ga-glint)" stop-opacity="0"/>
        <animateTransform attributeName="gradientTransform" type="translate" dur="${SHEEN.period}s" repeatCount="indefinite"
          values="${f(from)} 0; ${f(to)} 0; ${f(to)} 0" keyTimes="0; ${SHEEN.sweep}; 1"/>
      </linearGradient>`;
}

/* -------------------------------------------------------------------------- */
/*  Dial                                                                      */
/* -------------------------------------------------------------------------- */

/** Eight-point star that sits in the hub of the HUD dial. */
export function emblemMarkup() {
  const pts = [];
  const radii = [44, 10, 25, 10];
  for (let i = 0; i < 16; i++) {
    const a = (i * 22.5 - 90) * (Math.PI / 180);
    const r = radii[i % 4];
    pts.push(`${f(Math.cos(a) * r)},${f(Math.sin(a) * r)}`);
  }
  return `
    <polygon class="ga-emblem" points="${pts.join(" ")}"/>
    <circle class="ga-emblem-ring" r="16"/>
    <circle class="ga-gem" r="4.5"/>`;
}

/**
 * The day/night dial. Drawn in a box from -100 to 100, centred on 0,0.
 * The disc rotates so the sun is at the top at noon and the moon at midnight.
 * @param {string} p      unique prefix for gradient ids
 * @param {string} hub    markup placed inside the fixed centre hub
 * @param {object} sheen  travel of the light band in dial units: { from, to, scale }
 */
export function dialMarkup(p, hub = emblemMarkup(), sheen = { from: -330, to: 220, scale: 1.6 }) {
  const ticks = [];
  for (let i = 0; i < 24; i++) {
    const major = i % 6 === 0;
    ticks.push(
      `<line class="${major ? "ga-tick-major" : "ga-tick"}" x1="0" y1="-96.5" x2="0" y2="${major ? -88.5 : -92}" transform="rotate(${i * 15})"/>`
    );
  }
  const rays = [];
  for (let i = 0; i < 12; i++) {
    const long = i % 2 === 0;
    rays.push(`<line x1="0" y1="-10.5" x2="0" y2="${long ? -15.5 : -13}" transform="rotate(${i * 30})"/>`);
  }
  const stars = [
    [-52, 38, 1.2], [-30, 62, 0.9], [-66, 20, 0.8], [28, 66, 1.1], [50, 44, 0.9],
    [66, 22, 1.2], [-44, 54, 0.7], [40, 56, 0.7], [-18, 76, 0.8], [17, 78, 0.9],
    [-74, 32, 0.6], [73, 36, 0.7]
  ].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`);

  return `
    <defs>${sheenGradient(`${p}-sheen`, sheen.from, sheen.to, sheen.scale)}
      <linearGradient id="${p}-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style="stop-color:var(--ga-sky-1)"/>
        <stop offset="0.36" style="stop-color:var(--ga-sky-2)"/>
        <stop offset="0.52" style="stop-color:var(--ga-sky-3)"/>
        <stop offset="1" style="stop-color:var(--ga-sky-4)"/>
      </linearGradient>
      <radialGradient id="${p}-hub" cx="0.5" cy="0.4" r="0.7">
        <stop offset="0" style="stop-color:var(--ga-hub-1)"/>
        <stop offset="1" style="stop-color:var(--ga-hub-2)"/>
      </radialGradient>
      <clipPath id="${p}-hubclip"><circle r="53"/></clipPath>
      <linearGradient id="${p}-rim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style="stop-color:var(--ga-rim-1)"/>
        <stop offset="0.5" style="stop-color:var(--ga-rim-2)"/>
        <stop offset="1" style="stop-color:var(--ga-rim-3)"/>
      </linearGradient>
    </defs>
    <circle class="ga-dial-rim" r="98" fill="url(#${p}-rim)"/>
    <circle class="ga-dial-rim-line" r="98"/>
    <g class="ga-dial-disc">
      <circle r="87" fill="url(#${p}-sky)"/>
      <g class="ga-dial-stars">${stars.join("")}</g>
      <g class="ga-dial-sun" transform="translate(0,-71)">
        <circle class="ga-sun-glow" r="17"/>
        <g class="ga-sun-rays">${rays.join("")}</g>
        <circle class="ga-sun-core" r="7.5"/>
      </g>
      <g class="ga-dial-moon" transform="translate(0,71) rotate(180)">
        <path d="M0,-9 A9,9 0 1,1 0,9 A6.2,9 0 0,0 0,-9 Z"/>
      </g>
      <path class="ga-dial-horizon" d="M-76,0 l5,-3.5 l5,3.5 l-5,3.5 Z M66,0 l5,-3.5 l5,3.5 l-5,3.5 Z"/>
    </g>
    <circle class="ga-dial-inner-line" r="87"/>
    <circle class="ga-sheen" r="87" stroke="url(#${p}-sheen)"/>
    <g class="ga-dial-ticks">${ticks.join("")}</g>
    <circle class="ga-dial-hub" r="56" fill="url(#${p}-hub)"/>
    <circle class="ga-dial-hub-line" r="51.5"/>
    <circle class="ga-sheen" r="51.5" stroke="url(#${p}-sheen)"/>
    <g class="ga-dial-hub-art" clip-path="url(#${p}-hubclip)">${hub}</g>
    <path class="ga-dial-pointer" d="M0,-101 L4.5,-93 L0,-83 L-4.5,-93 Z"/>`;
}

/**
 * Rotation of the dial disc (degrees) for a time of day in seconds.
 * The sun is at the top at noon either way; `direction` is +1 or -1 and
 * decides which way the disc turns as time moves forward.
 */
export function dialAngle(secondsOfDay, direction = 1) {
  return direction * ((secondsOfDay / 3600 - 12) / 24) * 360;
}

function gearPath(teeth, rOuter, rInner) {
  const step = (Math.PI * 2) / teeth;
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [rInner, a - step * 0.28], [rOuter, a - step * 0.16],
      [rOuter, a + step * 0.16], [rInner, a + step * 0.28]
    ].map(([r, t]) => `${f(Math.cos(t) * r)},${f(Math.sin(t) * r)}`);
    d += `${i ? "L" : "M"}${pts.join(" L")} `;
  }
  return `${d}Z`;
}

/* -------------------------------------------------------------------------- */
/*  Small icons (drawn around 0,0; stroke uses currentColor)                  */
/* -------------------------------------------------------------------------- */

const CLOUD = "M-6.5,4 H5.5 A3.5,3.5 0 0 0 6,-3 A5,5 0 0 0 -3.6,-4.2 A4.2,4.2 0 0 0 -6.5,4 Z";

function sunIcon(r = 3.2, ray = 6.6) {
  let rays = "";
  for (let i = 0; i < 8; i++) rays += `<line x1="0" y1="${-(r + 1.6)}" x2="0" y2="${-ray}" transform="rotate(${i * 45})"/>`;
  return `<circle r="${r}"/>${rays}`;
}

export const SEASON_ICONS = {
  winter: (() => {
    let arms = "";
    for (let i = 0; i < 6; i++) {
      arms += `<g transform="rotate(${i * 60})"><line x1="0" y1="0" x2="0" y2="-7"/><path d="M-2.2,-6 L0,-4 L2.2,-6"/></g>`;
    }
    return arms;
  })(),
  spring: `<path d="M0,7 V-1"/><path d="M0,0 C-1,-5 -5,-6.5 -7,-6 C-7,-2 -4,0.5 0,0 Z"/><path d="M0,-2 C1,-6 4.5,-7.5 6.5,-7 C6.5,-3.5 3.5,-1.5 0,-2 Z"/>`,
  summer: sunIcon(3.2, 7),
  autumn: `<path d="M-6,6.5 C-7,-1 -2,-6.5 6.5,-6.5 C6.5,2 1,7 -6,6.5 Z"/><path d="M-6.5,7 L3,-3"/>`
};

export const WEATHER_ICONS = {
  clear: sunIcon(3.4, 7.4),
  clearNight: `<path d="M1.5,-7 A7,7 0 1,0 7,2.2 A5.6,5.6 0 0,1 1.5,-7 Z"/>`,
  cloudy: `<g transform="translate(3.5,-3.5) scale(0.75)">${sunIcon(3, 6.4)}</g><path class="ga-solid" d="${CLOUD}" transform="translate(-1,2)"/>`,
  overcast: `<path d="${CLOUD}" transform="translate(2.5,-2.5) scale(0.8)"/><path class="ga-solid" d="${CLOUD}" transform="translate(-1,2)"/>`,
  rain: `<path d="${CLOUD}" transform="translate(0,-2.5)"/><path class="ga-drops" d="M-4,4 l-1.2,3.4 M0,4 l-1.2,3.4 M4,4 l-1.2,3.4"/>`,
  storm: `<path d="${CLOUD}" transform="translate(0,-3)"/><path class="ga-bolt" d="M1.2,2.4 L-2.2,6.2 H0.6 L-1,9.6 L3,5.2 H0.4 Z"/>`,
  snow: `<path d="${CLOUD}" transform="translate(0,-2.5)"/><g class="ga-flakes"><circle cx="-4" cy="5.4" r="0.9"/><circle cx="0" cy="7.4" r="0.9"/><circle cx="4" cy="5.4" r="0.9"/></g>`,
  blizzard: `<path d="${CLOUD}" transform="translate(0,-3)"/><path d="M-7,4.2 H3 M-4,7.4 H7"/><g class="ga-flakes"><circle cx="5.6" cy="4.2" r="0.9"/><circle cx="-6.4" cy="7.4" r="0.9"/></g>`,
  fog: `<path d="M-7,-4 H5 M-5,0 H7 M-7,4 H3"/>`,
  wind: `<path d="M-7,-2 H2.5 A2.6,2.6 0 1 0 0,-4.8 M-7,2 H5 A2.4,2.4 0 1 1 2.8,4.6"/>`,
  still: `<path d="M-6,-5.5 L-4,0.5 L-2,-5.5 M1,-5.5 L3.5,4.5 L6,-5.5"/><circle cx="3.5" cy="7.4" r="0.7"/>`
};

/**
 * Moon icon for a phase fraction (0 = new, 0.5 = full), lit on the right while waxing.
 */
export function moonIcon(fraction, r = 6) {
  const waning = fraction > 0.5;
  const fr = waning ? 1 - fraction : fraction;
  const k = Math.cos(fr * Math.PI * 2);
  const rx = f(Math.max(0.01, Math.abs(k) * r));
  const lit = `M0,${-r} A${r},${r} 0 0 1 0,${r} A${rx},${r} 0 0 ${k > 0 ? 0 : 1} 0,${-r} Z`;
  return `<circle class="ga-moon-dark" r="${r}"/><path class="ga-moon-lit" d="${lit}"${waning ? ' transform="scale(-1,1)"' : ""}/>`;
}

/* -------------------------------------------------------------------------- */
/*  HUD frame                                                                 */
/* -------------------------------------------------------------------------- */

export const HUD_VIEW = { w: 640, h: 214 };

export function hudMarkup() {
  const archL = "M14,204 V78 Q14,30 113,14 Q212,30 212,78 V204 Z";
  const archLin = "M21,197 V80 Q21,37 113,22 Q205,37 205,80 V197 Z";
  const archR = "M428,204 V78 Q428,30 527,14 Q626,30 626,78 V204 Z";
  const archRin = "M435,197 V80 Q435,37 527,22 Q619,37 619,80 V197 Z";
  const plaque = "M208,122 H432 L448,151 L432,180 H208 L192,151 Z";
  const plaqueIn = "M211,127 H429 L442,151 L429,175 H211 L198,151 Z";
  const tab = "M258,180 H382 L372,207 H268 Z";

  return `
  <svg class="ga-svg" viewBox="0 0 ${HUD_VIEW.w} ${HUD_VIEW.h}" role="img" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gah-panel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style="stop-color:var(--ga-panel-1)"/>
        <stop offset="0.55" style="stop-color:var(--ga-panel-2)"/>
        <stop offset="1" style="stop-color:var(--ga-panel-3)"/>
      </linearGradient>
      <linearGradient id="gah-plaque" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style="stop-color:var(--ga-plaque-1)"/>
        <stop offset="1" style="stop-color:var(--ga-plaque-2)"/>
      </linearGradient>
      <linearGradient id="gah-merc" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" style="stop-color:var(--ga-merc)"/>
        <stop offset="0.45" style="stop-color:var(--ga-ember)"/>
        <stop offset="1" style="stop-color:var(--ga-merc)"/>
      </linearGradient>
${sheenGradient("gah-sheen", -160, 700)}
      <clipPath id="gah-tube"><rect x="465.6" y="50" width="8.8" height="62" rx="4.4"/></clipPath>
    </defs>

    <g class="ga-gear-wrap" transform="translate(392,40)">
      <g class="ga-gear">
        <path d="${gearPath(12, 27, 22)}"/>
        <circle r="15"/><circle r="5"/>
      </g>
    </g>

    <g class="ga-dial" transform="translate(320,104) scale(0.92)">
      ${dialMarkup("gah", emblemMarkup(), { from: (-160 - 320) / 0.92, to: (700 - 320) / 0.92, scale: 1 / 0.92 })}
    </g>

    <path class="ga-panel" d="${archL}" fill="url(#gah-panel)"/>
    <path class="ga-panel-line" d="${archLin}"/>
    <path class="ga-sheen" d="${archLin}" stroke="url(#gah-sheen)"/>
    <path class="ga-panel" d="${archR}" fill="url(#gah-panel)"/>
    <path class="ga-panel-line" d="${archRin}"/>
    <path class="ga-sheen" d="${archRin}" stroke="url(#gah-sheen)"/>
    <path class="ga-stud" d="M113,27 l4,5.5 l-4,5.5 l-4,-5.5 Z M527,27 l4,5.5 l-4,5.5 l-4,-5.5 Z"/>

    <!-- date -->
    <text class="ga-t ga-day" x="113" y="101" data-ga="day"></text>
    <g class="ga-festival-mark" data-ga="festivalMark" transform="translate(113,76)">
      <path d="M0,-26 L6,-6 L26,0 L6,6 L0,26 L-6,6 L-26,0 L-6,-6 Z"/>
      <circle r="4"/>
    </g>
    <text class="ga-t ga-month" x="113" y="133" data-ga="month"></text>
    <g class="ga-row" data-ga="seasonRow" data-cx="113">
      <g class="ga-icon" data-ga="seasonIcon" transform="translate(80,153)"></g>
      <text class="ga-t ga-sub" x="113" y="158" data-ga="season"></text>
    </g>
    <path class="ga-rule" d="M44,169 H182"/>
    <text class="ga-t ga-label ga-year" x="113" y="187" data-ga="year"></text>

    <!-- temperature -->
    <g class="ga-thermo">
      <rect class="ga-thermo-glass" x="464" y="48.4" width="12" height="66" rx="6"/>
      <circle class="ga-thermo-glass" cx="470" cy="114" r="10.5"/>
      <g clip-path="url(#gah-tube)">
        <rect class="ga-thermo-fill" data-ga="mercury" x="465.6" y="50" width="8.8" height="62" fill="url(#gah-merc)"/>
      </g>
      <circle class="ga-thermo-bulb" cx="470" cy="114" r="7.6"/>
      <path class="ga-thermo-marks" d="M479,58 h4 M479,70 h6 M479,82 h4 M479,94 h6"/>
    </g>
    <text class="ga-t ga-temp" x="548" y="101"><tspan data-ga="temp"></tspan><tspan class="ga-unit" dx="2" data-ga="unit"></tspan></text>
    <text class="ga-t ga-month" x="527" y="133" data-ga="band"></text>
    <g class="ga-row" data-ga="weatherRow" data-cx="527">
      <g class="ga-icon" data-ga="weatherIcon" transform="translate(490,153)"></g>
      <text class="ga-t ga-sub" x="527" y="158" data-ga="weather"></text>
    </g>
    <path class="ga-rule" d="M458,169 H596"/>
    <g class="ga-row" data-ga="moonRow" data-cx="527" data-gap="7">
      <g class="ga-icon ga-moon" data-ga="moonIcon" transform="translate(470,182.5)"></g>
      <text class="ga-t ga-label" x="527" y="187" data-ga="moon"></text>
    </g>

    <!-- time -->
    <path class="ga-tab" d="${tab}"/>
    <text class="ga-t ga-label ga-period" x="320" y="198.5" data-ga="period"></text>
    <path class="ga-plaque" d="${plaque}" fill="url(#gah-plaque)"/>
    <path class="ga-plaque-line" d="${plaqueIn}"/>
    <path class="ga-sheen" d="${plaqueIn}" stroke="url(#gah-sheen)"/>
    <path class="ga-stud" d="M226,151 l4.5,-6 l4.5,6 l-4.5,6 Z M405,151 l4.5,-6 l4.5,6 l-4.5,6 Z"/>
    <text class="ga-t ga-time" x="320" y="167"><tspan data-ga="hh"></tspan><tspan class="ga-colon">:</tspan><tspan data-ga="mm"></tspan><tspan class="ga-suffix" dx="5" data-ga="suffix"></tspan></text>
  </svg>`;
}

/* -------------------------------------------------------------------------- */
/*  Rest illustrations (white line art for the dial hub, drawn inside r = 50)  */
/* -------------------------------------------------------------------------- */

function flamePath(tipX, tipY, w, baseY) {
  const h = baseY - tipY;
  return [
    `M${f(tipX)},${f(tipY)}`,
    `C${f(tipX + w * 0.2)},${f(tipY + h * 0.3)} ${f(w * 1.05)},${f(baseY - h * 0.42)} ${f(w * 0.9)},${f(baseY - h * 0.16)}`,
    `C${f(w * 0.75)},${f(baseY + 1)} ${f(w * 0.3)},${f(baseY + 3)} 0,${f(baseY + 3)}`,
    `C${f(-w * 0.3)},${f(baseY + 3)} ${f(-w * 0.75)},${f(baseY + 1)} ${f(-w * 0.9)},${f(baseY - h * 0.16)}`,
    `C${f(-w * 1.05)},${f(baseY - h * 0.42)} ${f(tipX - w * 0.55)},${f(tipY + h * 0.34)} ${f(tipX)},${f(tipY)}`,
    "Z"
  ].join(" ");
}

function flame(cls, frames, w, baseY, dur) {
  const paths = frames.map(([x, y]) => flamePath(x, y, w, baseY));
  paths.push(paths[0]);
  return `<path class="${cls}" d="${paths[0]}"><animate attributeName="d" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keyTimes="${paths.map((_, i) => f(i / (paths.length - 1))).join(";")}" keySplines="${paths.slice(1).map(() => "0.4 0 0.6 1").join(";")}" values="${paths.join(";")}"/></path>`;
}

export function campfireMarkup() {
  return `
  <g class="ga-art ga-campfire">
    <path class="ga-art-ground" d="M-40,43 H-22 M-14,43 H16 M24,43 H40"/>
    <g class="ga-sparks">
      <circle cx="-9" cy="-26" r="1.3"/><circle cx="7" cy="-30" r="1"/>
      <circle cx="13" cy="-20" r="1.2"/><circle cx="-3" cy="-36" r="0.9"/>
    </g>
    <g transform="translate(-13,9) scale(0.5)">
      ${flame("ga-flame-out", [[-3, -34], [5, -30], [-6, -37], [2, -31]], 18, 24, 1.3)}
    </g>
    <g transform="translate(14,10) scale(0.46)">
      ${flame("ga-flame-out", [[4, -36], [-4, -31], [6, -33], [-2, -38]], 18, 24, 1.05)}
    </g>
    ${flame("ga-flame-out", [[2, -38], [-5, -34], [5, -40], [-2, -35]], 19, 24, 1.5)}
    ${flame("ga-flame-mid", [[-2, -15], [3, -18], [-3, -13], [2, -17]], 11.5, 23, 1.1)}
    ${flame("ga-flame-core", [[1, 2], [-2, 0], [2, 4], [-1, 1]], 5.6, 22, 0.9)}
    <g class="ga-logs">
      <g transform="translate(0,31) rotate(13)"><rect x="-31" y="-5.5" width="62" height="11" rx="5.5"/><circle cx="25.5" r="2.3"/></g>
      <g transform="translate(0,31) rotate(-13)"><rect x="-31" y="-5.5" width="62" height="11" rx="5.5"/><circle cx="-25.5" r="2.3"/><path d="M-12,-1.5 H4 M6,2 H16"/></g>
    </g>
  </g>`;
}

export function bandageMarkup() {
  const arm = "M-74,-14.5 L2,-10.5 C6,-12.5 12,-12.5 22,-12 Q31.5,-11.5 31.5,0 Q31.5,11.5 22,12 C12,12.5 6,12.5 2,10.5 L-74,14.5 Z";
  const xs = [-46, -37.5, -29, -20.5, -12, -3.5, 5];
  const cycle = 5.2;
  const first = 5;
  const step = 9.2;
  const draw = 5.4;
  const LEN = 34;

  let css = "";
  let roll = `0%{transform:translate(${xs[0] - 12}px,-26px);opacity:0}`;
  xs.forEach((x, i) => {
    const s = first + i * step;
    const e = s + draw;
    css += `@keyframes ga-wrap-${i}{0%,${f(s)}%{stroke-dashoffset:${LEN};opacity:1}${f(e)}%,86%{stroke-dashoffset:0;opacity:1}93%{stroke-dashoffset:0;opacity:0}100%{stroke-dashoffset:${LEN};opacity:0}}`;
    css += `.ga-wrap-${i}{stroke-dasharray:${LEN};animation:ga-wrap-${i} ${cycle}s linear infinite}`;
    roll += `${f(s)}%{transform:translate(${x - 3.4}px,-20px);opacity:1}`;
    roll += `${f(e)}%{transform:translate(${x + 3.4}px,20px);opacity:1}`;
    if (i < xs.length - 1) roll += `${f(e + (step - draw) / 2)}%{transform:translate(${x + 4}px,0px);opacity:0.25}`;
  });
  const end = first + (xs.length - 1) * step + draw;
  roll += `${f(end + 5)}%{transform:translate(${xs[xs.length - 1] + 12}px,30px);opacity:0}100%{transform:translate(${xs[0] - 12}px,-26px);opacity:0}`;
  css += `@keyframes ga-roll{${roll}}.ga-roll{animation:ga-roll ${cycle}s linear infinite}`;

  const bands = xs
    .map((x, i) => `<line class="ga-wrap ga-wrap-${i}" x1="${x - 3}" y1="-17" x2="${x + 3}" y2="17"/>`)
    .join("");
  const fingers = [
    [-8.6, 19, -7], [-2.9, 22.5, -2], [2.9, 20.5, 3], [8.6, 15.5, 9]
  ].map(([y, len, rot]) => `<rect x="24" y="${y - 2.9}" width="${len + 4}" height="5.8" rx="2.9" transform="rotate(${rot} 24 ${y})"/>`).join("");

  return `
  <g class="ga-art ga-bandage">
    <style>${css}</style>
    <defs><clipPath id="ga-arm-clip"><path d="${arm}"/></clipPath></defs>
    <g transform="translate(3,6) rotate(-24)">
      <g class="ga-hand">
        ${fingers}
        <rect x="9" y="-14" width="21" height="7" rx="3.5" transform="rotate(-52 12 -10)"/>
        <path d="${arm}"/>
      </g>
      <g clip-path="url(#ga-arm-clip)">${bands}</g>
      <path class="ga-hand-outline" d="${arm}"/>
      <g class="ga-roll">
        <circle r="6.8"/><circle r="2.4"/>
        <path d="M-6.8,0 V9"/>
      </g>
    </g>
  </g>`;
}
