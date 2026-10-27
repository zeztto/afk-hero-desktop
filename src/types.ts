export type AppScreen = "title" | "opening" | "game" | "bossStory" | "storyReplay" | "settings";
export type DisplayMode = "windowed" | "borderless" | "fullscreen";
export type AudioSettings = {
  enabled: boolean;
  volume: number;
};
export type RuntimeSettings = {
  lowPower: boolean;
  battleSpeed: 1 | 2;
};
export type WindowSettings = {
  alwaysOnTop: boolean;
  compactMode: boolean;
};
