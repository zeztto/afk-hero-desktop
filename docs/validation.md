# Validation scope

이 source edition은 원본 private completion audit의 완료 주장을 재사용하지 않습니다. 현재 Node.js 환경에서 clean npm ci·typecheck·production build·기본 dependency audit0·전체 unit regression을 실행했습니다. 기존 11개 test file을 보존하고 profile·save preservation regression을 추가했습니다.

- profile: ready 이전 userData·session·logs·crash 경로 격리와 relative override 거부를 RED→GREEN으로 검증했습니다.
- 저장 보존: corrupt·unsupported browser/native primary의 load/autosave 차단, 정상 상태로 위장하는 native read fallback 금지, 명시 복구 시 unreadable 원문 archive, AFK 외 storage 보존을 test-only 파일과 module contract에서 검증했습니다.
- 경합: 지연된 실제 test-file write와 reset을 겹쳐 ENOENT를 재현한 뒤 native disk queue로 GREEN을 확인했습니다. renderer도 명시 교체 전에 autosave를 pause/drain합니다.
- 실제 Electron: `npm run smoke:packaged`는 packaged app·preload·IPC·filesystem을 실행하는 22개 시나리오입니다. browser renderer나 Electron API mock은 이 통합 증거를 대신하지 않습니다. fresh profile의 onboarding/combat·relaunch·offline cap·장비·skill·campaign·native save/export/import/recovery 등을 포함합니다. corrupt-primary 시나리오는 자동·직접 쓰기 차단과 명시 Restore Backup 후 원문 archive를 확인합니다.
- test profile·QA artifact root는 명시적 전용 경로로 격리하며 source 공개에서 모두 제외합니다. 기존 설치본·실사용 save를 수정하지 않습니다.
- Apple Silicon macOS local package는 Developer ID signing·notarization을 수행하지 않습니다. local package 생성과 signed public release는 별도 단계입니다.

source freeze의 실제 native QA 결과는 별도 private readiness report에 연결합니다. 이 문서는 아직 실행되지 않은 native/CI/public release 성공을 주장하지 않습니다.

## Native fixture schema 정합성

최초 실제 packaged run은 fresh·relaunch 뒤 short-offline fixture에서 중단됐습니다. 제품 validator를 완화하지 않고, 수작업으로 작성된 기존 native harness seed의 누락 `battlePlan`·`claimedContracts`와 현재 `maxSkillRank=5`를 넘는 campaign fixture의 rank 8을 현재 canonical SaveV1 값으로 보완했습니다. 현재 `createInitialGameState`가 생성하는 필수 필드와 기존 native write guard를 근거로 한 test-data 수정이며 실제 사용자 save를 변경하지 않았습니다.

`node scripts/smoke-packaged.mjs --fixtures-only`는 GUI 실행 전 정상 seed factory 16개를 같은 native guard로 검증합니다. intentionally corrupt-primary와 tampered-import 사례는 정상 seed와 분리해 실패/보존 동작을 그대로 검증합니다. 최초 실패 로그·원 fixture·source freeze는 private QA evidence에 보존하며 이후 source revision의 native 결과를 구분합니다.
