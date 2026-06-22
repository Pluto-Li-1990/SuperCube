import { Element } from "../core/types";
import fireUrl from "../assets/elements/fire.png";
import waterUrl from "../assets/elements/water.png";
import iceUrl from "../assets/elements/ice.png";
import earthUrl from "../assets/elements/earth.png";
import woodUrl from "../assets/elements/wood.png";
import stickyUrl from "../assets/elements/sticky.png";
import lifeUrl from "../assets/elements/life.png";
import metalUrl from "../assets/elements/metal.png";

// 元素 → 美术贴图 URL
export const ELEMENT_ART_URL: Partial<Record<Element, string>> = {
  [Element.Fire]: fireUrl,
  [Element.Water]: waterUrl,
  [Element.Ice]: iceUrl,
  [Element.Earth]: earthUrl,
  [Element.Wood]: woodUrl,
  [Element.Sticky]: stickyUrl,
  [Element.Life]: lifeUrl,
  [Element.Metal]: metalUrl,
};

// 已加载的图像对象（渲染器读取）。node 验证时可手动填充。
export const elementImages: Partial<Record<Element, CanvasImageSource>> = {};

// 浏览器端预加载（node/vite-node 无 Image，直接跳过）
export function loadElementArt(): void {
  if (typeof Image === "undefined") return;
  for (const [el, url] of Object.entries(ELEMENT_ART_URL)) {
    const img = new Image();
    img.src = url as string;
    elementImages[Number(el) as Element] = img;
  }
}

// 图像是否已可绘制
export function imgReady(img: CanvasImageSource | undefined): boolean {
  if (!img) return false;
  const anyImg = img as { naturalWidth?: number; width?: number; complete?: boolean };
  if (anyImg.complete === false) return false;
  return (anyImg.naturalWidth ?? anyImg.width ?? 0) > 0;
}
