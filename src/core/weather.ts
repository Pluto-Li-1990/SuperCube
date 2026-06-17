import { Weather } from "./types";
import { RNG } from "./rng";

export const WEATHER_PERIOD = 5; // 每 5 回合切换一次
export const FORECAST_ERROR_RATE = 0.25; // 预报报错概率（坑人）

const ALL_WEATHER: Weather[] = [
  Weather.Sunny,
  Weather.Rain,
  Weather.Snow,
  Weather.Thunder,
  Weather.Volcano,
];

export class WeatherSystem {
  rng: RNG;
  current: Weather;
  // 下一个周期的"真实"天气
  nextReal: Weather;
  // 下一个周期对玩家显示的"预报"天气（可能与 nextReal 不符）
  nextForecast: Weather;
  // 距离下次切换还有多少回合
  turnsUntilSwitch: number;

  constructor(rng: RNG, start?: Weather) {
    this.rng = rng;
    this.current = start ?? rng.pick(ALL_WEATHER);
    this.nextReal = this.rollDifferent(this.current);
    this.nextForecast = this.makeForecast(this.nextReal);
    this.turnsUntilSwitch = WEATHER_PERIOD;
  }

  private rollDifferent(exclude: Weather): Weather {
    let w = this.rng.pick(ALL_WEATHER);
    let guard = 0;
    while (w === exclude && guard++ < 10) w = this.rng.pick(ALL_WEATHER);
    return w;
  }

  // 有概率给出错误预报
  private makeForecast(real: Weather): Weather {
    if (this.rng.next() < FORECAST_ERROR_RATE) {
      return this.rollDifferent(real);
    }
    return real;
  }

  // 每回合推进；返回是否在本回合发生了切换
  tick(): boolean {
    this.turnsUntilSwitch--;
    if (this.turnsUntilSwitch <= 0) {
      this.current = this.nextReal;
      this.nextReal = this.rollDifferent(this.current);
      this.nextForecast = this.makeForecast(this.nextReal);
      this.turnsUntilSwitch = WEATHER_PERIOD;
      return true;
    }
    return false;
  }
}
