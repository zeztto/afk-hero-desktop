import type { AppScreen } from "./types";

export type RuntimeCadence = {
  tickMs: number;
  renderMs: number;
  renderEnabled: boolean;
};

export function getRuntimeCadence(screen: AppScreen, hidden: boolean, focused: boolean, lowPower = false): RuntimeCadence {
  if (screen !== "game") {
    return {
      tickMs: 500,
      renderMs: 500,
      renderEnabled: false
    };
  }

  if (hidden) {
    return {
      tickMs: 1000,
      renderMs: 1000,
      renderEnabled: false
    };
  }

  if (!focused) {
    return {
      tickMs: 500,
      renderMs: 100,
      renderEnabled: true
    };
  }

  if (lowPower) {
    return {
      tickMs: 500,
      renderMs: 250,
      renderEnabled: true
    };
  }

  return {
    tickMs: 250,
    renderMs: 0,
    renderEnabled: true
  };
}
