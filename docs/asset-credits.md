# AFK HERO Asset Credits

기준일: 2026-05-31

## Generated assets

### Steamworks Forge Background

- Generated with: built-in `image_gen`
- Prompt summary: retro 2D steampunk pixel-art inspired battle backdrop, brass pipes, gauges, boiler glow, distant smokestacks, no text/UI/characters
- Local file: `src/assets/backgrounds/steamworks-forge.png`
- Usage: battle canvas background

### AFK HERO Steampunk Hero

- Generated with: built-in `image_gen`
- Prompt summary: full-body retro steampunk engineer-adventurer hero sprite, brass goggles, gearblade, boiler backpack, chroma-key background removed locally
- Local file: `src/assets/sprites/afk-hero-steampunk.png`
- Usage: player hero portrait and battle sprite

### AFK HERO Pipe Raider Enemy

- Generated with: built-in `image_gen`
- Prompt summary: full-body retro steampunk Clockwork Pipe Raider, compact brass automaton, amber gauge eye, copper pipes, wrench-claw arm, piston boots, chroma-key background removed locally
- Local file: `src/assets/sprites/afk-hero-enemy.png`
- Usage: normal enemy battle sprite

### AFK HERO Scrap Gear Duelist Enemy

- Generated with: built-in `image_gen`
- Prompt summary: lean retro steampunk Scrap Gear Duelist, mismatched brass plates, pressure-cap top hat, red scarf, saw-tooth rapier, spring-loaded legs, chroma-key background removed locally
- Local file: `src/assets/sprites/generated/enemy-scrap-duelist.png`
- Usage: normal enemy battle sprite pool

### AFK HERO Furnace Crawler Enemy

- Generated with: built-in `image_gen`
- Prompt summary: squat retro steampunk Furnace Crawler, tank treads, glowing furnace belly, coal-shovel mandibles, riveted iron shell, twin smokestacks, chroma-key background removed locally
- Local file: `src/assets/sprites/generated/enemy-furnace-crawler.png`
- Usage: normal enemy battle sprite pool

### AFK HERO Aether Drone Enemy

- Generated with: built-in `image_gen`
- Prompt summary: hovering retro steampunk Aether Gear Drone, brass propeller ring, teal glass core, copper coils, claw arms, gauge face, chroma-key background removed locally
- Local file: `src/assets/sprites/generated/enemy-aether-drone.png`
- Usage: normal enemy battle sprite pool

### AFK HERO Cathedral Censer Guard Enemy

- Generated with: built-in `image_gen`
- Prompt summary: robed retro steampunk Cathedral Censer Guard, incense boiler backpack, bellows mask, chain censer, chapel-foundry armor, amber furnace glow, chroma-key background removed locally
- Local file: `src/assets/sprites/generated/enemy-censer-guard.png`
- Usage: normal enemy battle sprite pool

### AFK HERO Void Riveter Enemy

- Generated with: built-in `image_gen`
- Prompt summary: corrupted retro steampunk Void Riveter, blackened brass armor, violet aether core, rivet cannon arm, torn pressure cables, teal gauges, chroma-key background removed locally
- Local file: `src/assets/sprites/generated/enemy-void-riveter.png`
- Usage: normal enemy battle sprite pool

### AFK HERO Boiler Tyrant Boss

- Generated with: built-in `image_gen`
- Prompt summary: towering retro steampunk Boiler Tyrant boss, massive glowing furnace chest, pressure-valve crown, huge piston arms, riveted iron legs, copper pipe spine, chroma-key background removed locally
- Local file: `src/assets/sprites/afk-hero-boss.png`
- Usage: boss battle sprite

### AFK HERO Harbor Gearlord Boss

- Generated with: built-in `image_gen`
- Prompt summary: massive retro steampunk Harbor Gearlord, crane-hook arm, anchor-chain armor, tide-lock boiler chest, diving-helmet head, hydraulic dockyard legs, chroma-key background removed locally
- Local file: `src/assets/sprites/generated/boss-harbor-gearlord.png`
- Usage: boss battle sprite pool

### AFK HERO Foundry Colossus Boss

- Generated with: built-in `image_gen`
- Prompt summary: massive retro steampunk Foundry Colossus boss, molten core, broad riveted chest, shoulder pressure cannons, forge gauntlets, smokestack crown, chroma-key background removed locally
- Local file: `src/assets/sprites/generated/boss-foundry-colossus.png`
- Usage: boss battle sprite pool

### AFK HERO Rail Siege Engine Boss

- Generated with: built-in `image_gen`
- Prompt summary: walking retro steampunk Rail Siege Engine boss, locomotive knight body, cowcatcher chest guard, headlamp eye, rail-wheel shoulders, piston hammer arm, chroma-key background removed locally
- Local file: `src/assets/sprites/generated/boss-rail-siege-engine.png`
- Usage: boss battle sprite pool

### AFK HERO Cathedral Furnace Boss

- Generated with: built-in `image_gen`
- Prompt summary: gigantic retro steampunk Cathedral Furnace, stained-glass furnace chest, bell tower shoulders, pipe-organ exhausts, censer flail, brass altar armor, chroma-key background removed locally
- Local file: `src/assets/sprites/generated/boss-cathedral-furnace.png`
- Usage: boss battle sprite pool

### AFK HERO Clocktower Warden Boss

- Generated with: built-in `image_gen`
- Prompt summary: towering retro steampunk Clocktower Warden, clock-face chest, pendulum blade arm, gear halo crown, timekeeper mask, piston legs, chroma-key background removed locally
- Local file: `src/assets/sprites/generated/boss-clocktower-warden.png`
- Usage: boss battle sprite pool

### AFK HERO Attack FX

- Generated with: built-in `image_gen`
- Prompt summary: retro steampunk brass/teal slash effect with gears, sparks, and steam, chroma-key background removed locally
- Local file: `src/assets/sprites/afk-hero-attack-fx.png`
- Usage: battle canvas attack effect overlay

### AFK HERO macOS App Icon

- Generated with: built-in `image_gen`
- Prompt summary: retro steampunk AFK HERO icon composition with hero, brass frame, steamworks city backdrop, and `AH` app mark
- Local file: `build/icon.png`, `build/icon.icns`
- Usage: macOS app bundle icon and release packaging

## 적용한 무료 external sprite assets

현재 runtime에서 사용하는 external sprite asset은 없다.

## Notes

- Generated assets는 project-bound asset으로 workspace에 복사해 사용한다.
- Runtime sprite selection uses a generated pool of 6 normal enemy families and 6 region bosses.
- Enemy/boss sprites were regenerated on 2026-05-31 with project-local chroma-key removal and alpha PNG validation.
- `npm run assets:check` verifies required PNG dimensions/color type, 6 normal enemy sprites, 6 boss sprites, and `electron-builder` macOS icon wiring.

## Source edition 배포 범위

원저장소의 생성 이력에 기재된 16개 project 제작 원본(게임 이미지 15개와 icon 원본 1개)을 유지합니다. icon 원본에서 파생한 10개 iconset PNG와 ICNS를 합해 PNG 26개·ICNS 1개입니다. 이 사본에서는 새로운 이미지를 생성하거나 기존 pixel을 변경하지 않았습니다. first-party project assets는 루트 MIT 조건으로 제공하며, 외부 상표나 제3자 artwork의 권리를 주장하지 않습니다.

`asset-inventory.json`은 전체 27개 파일의 크기·형식·SHA-256을 기록합니다. 원본 credit은 생성 출처 기록이며 독립적인 사람의 수작업 제작을 의미하지 않습니다. Electron·Chromium·Lucide 등 외부 library notices는 루트 third-party notices에 있습니다.
