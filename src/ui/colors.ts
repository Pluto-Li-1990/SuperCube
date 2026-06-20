import { Element, Weather } from "../core/types";

// 元素配色（精炼现代调色板）
export const ELEMENT_COLORS: Record<Element, string> = {
  [Element.Empty]: "#11131a",
  [Element.Earth]: "#a98e6b", // 砖土
  [Element.Fire]: "#ff6b45", // 火
  [Element.Water]: "#3fa9f5", // 水
  [Element.Wood]: "#5bbf6a", // 木
  [Element.Metal]: "#aeb7c2", // 金属
  [Element.Ice]: "#9fdcf0", // 冰
  [Element.Sticky]: "#bd7be6", // 粘粘
  [Element.Life]: "#ffcf4d", // 生命
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
