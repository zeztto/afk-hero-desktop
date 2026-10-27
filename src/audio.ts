import type { AudioSettings } from "./types";

export type AudioCue = "attack" | "overdrive" | "boss" | "claim";

type BrowserAudioContext = AudioContext & {
  currentTime: number;
};

export function createAudioEngine(getSettings: () => AudioSettings) {
  let context: BrowserAudioContext | null = null;
  let lastPlayed = 0;

  const getContext = () => {
    const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }
    context ??= new AudioCtor() as BrowserAudioContext;
    return context;
  };

  const unlock = () => {
    const audioContext = getContext();
    if (!audioContext) {
      return;
    }
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }
  };

  const play = (cue: AudioCue) => {
    const settings = getSettings();
    if (!settings.enabled || settings.volume <= 0 || document.visibilityState === "hidden") {
      return;
    }
    const audioContext = getContext();
    if (!audioContext || audioContext.state === "suspended") {
      return;
    }
    const now = audioContext.currentTime;
    if (now - lastPlayed < 0.08) {
      return;
    }
    lastPlayed = now;
    playCue(audioContext, cue, settings.volume);
  };

  return { unlock, play };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function playCue(context: BrowserAudioContext, cue: AudioCue, volume: number) {
  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * cueGain(cue)), now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + cueDuration(cue));
  gain.connect(context.destination);

  cueFrequencies(cue).forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = cue === "boss" ? "sawtooth" : cue === "claim" ? "triangle" : "square";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.035);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * cueSweep(cue), now + cueDuration(cue));
    oscillator.connect(gain);
    oscillator.start(now + index * 0.025);
    oscillator.stop(now + cueDuration(cue));
  });
}

function cueFrequencies(cue: AudioCue) {
  if (cue === "boss") {
    return [94, 141, 188];
  }
  if (cue === "overdrive") {
    return [220, 330, 495];
  }
  if (cue === "claim") {
    return [392, 523, 659];
  }
  return [176, 264];
}

function cueDuration(cue: AudioCue) {
  if (cue === "boss") {
    return 0.42;
  }
  if (cue === "overdrive") {
    return 0.28;
  }
  if (cue === "claim") {
    return 0.34;
  }
  return 0.12;
}

function cueGain(cue: AudioCue) {
  if (cue === "attack") {
    return 0.045;
  }
  return 0.08;
}

function cueSweep(cue: AudioCue) {
  if (cue === "boss") {
    return 0.56;
  }
  if (cue === "attack") {
    return 1.34;
  }
  return 1.8;
}
