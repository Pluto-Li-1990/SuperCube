import { ELEMENT_ART_URL } from "./elementsArt";
import { Element } from "../core/types";

export class Splash {
  constructor(root: HTMLElement, onDone: () => void) {
    const el = document.createElement("div");
    el.className = "splash";
    const fire = ELEMENT_ART_URL[Element.Fire] ?? "";
    const water = ELEMENT_ART_URL[Element.Water] ?? "";
    const wood = ELEMENT_ART_URL[Element.Wood] ?? "";
    const life = ELEMENT_ART_URL[Element.Life] ?? "";
    el.innerHTML = `
      <div class="splash-glow"></div>
      <div class="splash-cube">
        <img class="sc-tile sc-t0" src="${fire}" alt="">
        <img class="sc-tile sc-t1" src="${water}" alt="">
        <img class="sc-tile sc-t2" src="${wood}" alt="">
        <img class="sc-tile sc-t3" src="${life}" alt="">
      </div>
      <div class="splash-title">SUPER<span>CUBE</span></div>
      <div class="splash-tagline">元素 · 天气 · 相爱相杀</div>`;
    root.appendChild(el);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.classList.add("splash-out");
      setTimeout(() => {
        el.remove();
        onDone();
      }, 500);
    };
    el.addEventListener("click", finish);
    setTimeout(finish, 2600);
  }
}
