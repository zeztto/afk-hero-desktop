# AFK HERO Desktop

React와 Electron으로 만든 로컬 데스크톱 idle RPG의 source edition입니다. 자동 전투, 장비 성장·장착, 지역 이동, boss 전투, 오프라인 보상, Reforge, 저장 복구·내보내기·가져오기를 포함합니다. 원본 설치본과 분리된 이름·bundle identifier·profile을 사용합니다.

## 실행과 검사

Node.js 24 이상이 필요합니다. `npm ci` 후 `npm test`, `npm run typecheck`, `npm run build`를 실행합니다. npm 환경에서 Electron postinstall이 차단되었다면 `node node_modules/electron/install.js`로 공식 runtime을 설치합니다. `npm run dev`는 loopback Vite와 개발 Electron을 엽니다.

Apple Silicon macOS에서 `npm run package:local`은 `release/mac-arm64/AFK HERO.app`을 만듭니다. 이 local packaging 경로는 Developer ID signing과 notarization을 수행하지 않습니다. source 공개와 signed installer 공개는 별개의 단계입니다. `release:public` 계열은 실제 배포 인증서와 Apple notarization을 요구하는 별도 preflight를 포함하며 성공을 주장하지 않습니다.

## 저장과 테스트 profile

기본 앱 이름은 `AFK HERO Source Edition`, bundle identifier는 `dev.zeztto.afkhero.source`입니다. 기존 원본 앱의 profile과 공유하지 않습니다. `AFK_HERO_USER_DATA_DIR`에 **테스트 전용 절대 경로**를 지정하면 save, Chromium session, logs, crash dumps가 모두 그 아래에 생성됩니다. 기존 사용자 save 경로를 지정하지 마세요. HOME·사용자 환경을 재정의할 필요가 없습니다.

macOS에서 테스트용 폴더를 직접 만들고 해당 환경 변수와 함께 위 `.app/Contents/MacOS/AFK HERO` executable을 실행할 수 있습니다. 같은 테스트 경로로 다시 열면 저장과 오프라인 보상을 확인할 수 있습니다. UI의 Settings에서 Save Now·Export Save·Import Save·Restore Backup을 사용합니다. export/import 대상은 사용자가 파일 선택 창에서 고릅니다.

손상·미지원 save를 읽으면 자동으로 새 게임을 저장하지 않고 복구 화면에서 저장을 차단합니다. Restore Backup 또는 검증된 Import Save를 명시적으로 선택하면 읽을 수 없던 primary 원문을 별도 파일로 보존한 뒤 복구합니다. Reset Save는 사용자가 확인한 초기화입니다.

모든 native 저장·읽기·복구·초기화 작업은 같은 queue에서 직렬 실행합니다. 명시적 import/reset/restore 동안 renderer autosave를 중지하고 진행 중 쓰기를 마친 뒤 새 상태로 재개합니다.

저장은 JSON schema·숫자·unsafe key·size 검증 후 임시 파일과 rename으로 기록하고 backup을 보존합니다. 이 기능은 cloud sync나 계정 저장이 아닙니다. 오프라인 진행은 게임 코드의 상한과 보상 규칙을 따릅니다. 모든 게임 수치는 로컬 save에서 계산합니다.

## 검증과 배포 범위

[validation](docs/validation.md)은 이 source edition의 실제 실행 범위와 미검증 경계를 기록합니다. unit test의 시뮬레이션을 실제 native save 검증으로 간주하지 않습니다. `npm run smoke:packaged`는 실제 packaged Electron(preload·IPC·filesystem)에서 22개 시나리오를 격리된 test profiles로 native bridge와 재시작을 검증하며 생성물은 ignored `qa-artifacts/` 아래에 둡니다. browser renderer나 Electron API mock은 이 통합 검증을 대신하지 않습니다. `AFK_HERO_QA_ARTIFACT_DIR`로 새 QA 전용 절대 경로를 지정할 수 있습니다. 종료는 harness의 `app.close()`가 해당 테스트 앱에만 적용합니다. QA 이미지와 test save는 source 공개 대상에서 제외합니다.

first-party 코드·project artwork에는 [MIT](LICENSE)를 적용합니다. 생성 artwork 16개와 icon 파생본의 출처·전체 27파일 hash는 [asset credits](docs/asset-credits.md)와 [inventory](docs/asset-inventory.json)에 기록합니다. 외부 패키지·Electron·Chromium의 원문 notice는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인하세요.
