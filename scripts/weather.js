/**
 * Grim Almanac — weather.
 * Temperatures are stored in °C and converted for display only.
 */

export const CONDITIONS = [
  "clear", "cloudy", "overcast", "rain", "storm", "snow", "blizzard", "fog", "wind", "still"
];

/**
 * means     average daily temperature per season (°C)
 * variance  how far a day can drift from the mean
 * swing     difference between the afternoon peak / pre-dawn low and the daily mean
 * weights   relative odds of each condition
 */
export const CLIMATES = {
  temperate: {
    means: { winter: -2, spring: 11, summer: 23, autumn: 10 },
    variance: 6, swing: 4,
    weights: { clear: 30, cloudy: 22, overcast: 14, rain: 16, storm: 5, fog: 6, wind: 7 }
  },
  cold: {
    means: { winter: -22, spring: -7, summer: 9, autumn: -5 },
    variance: 7, swing: 4,
    weights: { clear: 24, cloudy: 20, overcast: 18, rain: 18, storm: 8, fog: 4, wind: 8 }
  },
  warm: {
    means: { winter: 12, spring: 20, summer: 30, autumn: 21 },
    variance: 5, swing: 5,
    weights: { clear: 40, cloudy: 22, overcast: 10, rain: 12, storm: 5, fog: 3, wind: 8 }
  },
  desert: {
    means: { winter: 15, spring: 27, summer: 39, autumn: 26 },
    variance: 5, swing: 9,
    weights: { clear: 68, cloudy: 12, overcast: 3, rain: 2, storm: 2, fog: 1, wind: 12 }
  },
  tropical: {
    means: { winter: 25, spring: 28, summer: 30, autumn: 27 },
    variance: 3, swing: 3,
    weights: { clear: 22, cloudy: 20, overcast: 12, rain: 28, storm: 12, fog: 4, wind: 2 }
  },
  underground: {
    means: { winter: 12, spring: 12, summer: 12, autumn: 12 },
    variance: 2, swing: 0,
    weights: { still: 80, fog: 20 }
  }
};

function pick(weights, rng) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[0][0];
}

/** Roll a day's weather. Returns the daily mean temperature and a condition. */
export function rollWeather(climateKey, season, rng = Math.random) {
  const climate = CLIMATES[climateKey] ?? CLIMATES.temperate;
  const mean = climate.means[season] ?? climate.means.spring;
  // Sum of three rolls gives a soft bell curve in [-1, 1].
  const drift = (rng() + rng() + rng() - 1.5) / 1.5;
  let base = Math.round(mean + drift * climate.variance);
  let condition = pick(climate.weights, rng);
  if (condition === "rain" || condition === "storm" || condition === "overcast") base -= 2;
  if (base <= 0 && condition === "rain") condition = "snow";
  if (base <= -2 && condition === "storm") condition = "blizzard";
  return { base, condition };
}

/** How far the temperature sits from the daily mean at a given hour (peak 15:00). */
export function diurnalOffset(climateKey, hourFloat) {
  const swing = (CLIMATES[climateKey] ?? CLIMATES.temperate).swing;
  return swing * Math.cos(((hourFloat - 15) / 24) * Math.PI * 2);
}

/** Temperature right now in °C. */
export function currentTemp(weather, hourFloat) {
  const base = Number(weather?.base) || 0;
  if (!weather?.auto) return Math.round(base);
  return Math.round(base + diurnalOffset(weather.climate, hourFloat));
}

export function tempBand(c) {
  if (c < -15) return "bitter";
  if (c < -3) return "freezing";
  if (c < 6) return "cold";
  if (c < 14) return "chilly";
  if (c < 21) return "mild";
  if (c < 28) return "warm";
  if (c < 36) return "hot";
  return "scorching";
}

export function toUnit(c, unit) {
  return unit === "F" ? Math.round((c * 9) / 5 + 32) : Math.round(c);
}

export function fromUnit(v, unit) {
  return unit === "F" ? ((v - 32) * 5) / 9 : v;
}

export function defaultWeather() {
  return { auto: true, climate: "temperate", base: 10, condition: "clear", day: -1 };
}
