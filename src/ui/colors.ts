import { Element, Weather } from "../core/types";

// 元素配色（霓虹方块风）
export const ELEMENT_COLORS: Record<Element, string> = {
  [Element.Empty]: "#11131a",
  [Element.Earth]: "#8a7253", // 砖土
  [Element.Fire]: "#ff5a36", // 火
  [Element.Water]: "#36a3ff", // 水
  [Element.Wood]: "#4caf50", // 木
  [Element.Metal]: "#b8c2cc", // 金属
  [Element.Ice]: "#a7e8ff", // 冰
  [Element.Sticky]: "#c77dff", // 粘粘
  [Element.Life]: "#ffd23f", // 生命
};

export const ELEMENT_GLYPH: Record<Element, string> = {
  [Element.Empty]: "",
  [Element.Earth]: "",
  [Element.Fire]: "🔥",
  [Element.Water]: "💧",
  [Element.Wood]: "🌳",
  [Element.Metal]: "⚙",
  [Element.Ice]: "❄",
  [Element.Sticky]: "🟣",
  [Element.Life]: "✦",
};

export const WEATHER_BG: Record<Weather, [string, string]> = {
  [Weather.Sunny]: ["#1a2a4a", "#0d1530"],
  [Weather.Rain]: ["#1a2530", "#0a1018"],
  [Weather.Snow]: ["#1f2a35", "#0e161d"],
  [Weather.Thunder]: ["#2a1a3a", "#100820"],
  [Weather.Volcano]: ["#3a1a1a", "#1a0808"],
};

export const WEATHER_ICON: Record<Weather, string> = {
  [Weather.Sunny]: "☀️",
  [Weather.Rain]: "🌧️",
  [Weather.Snow]: "❄️",
  [Weather.Thunder]: "⚡",
  [Weather.Volcano]: "🌋",
};

export function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  r = Math.min(255, Math.round(r + (255 - r) * amt));
  g = Math.min(255, Math.round(g + (255 - g) * amt));
  b = Math.min(255, Math.round(b + (255 - b) * amt));
  return `rgb(${r},${g},${b})`;
}
