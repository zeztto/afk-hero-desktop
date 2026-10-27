# Changelog

## 1.0.0 source edition

- 원본 game·native bridge·기존 11개 test file과 생성 artwork를 보존한 공개용 사본을 준비했습니다.
- 앱 이름·bundle identifier를 분리하고 명시적 test profile에 session·logs·crash dumps까지 격리하도록 수정했습니다.
- profile isolation 회귀·local unsigned packaging config·CI·원문 dependency notices를 추가했습니다.
- 개인 local 경로가 있는 내부 planning 자료와 이전 QA 완료 주장은 공개 사본에서 제외했습니다.

- 손상·미지원 save의 자동 덮어쓰기를 차단하고 명시 복구 시 unreadable 원문을 보존하도록 수정했습니다. crash 복구 초기화는 AFK 소유 browser key만 제거합니다.
- autosave와 명시적 import/reset/restore 경합을 방지하도록 disk queue와 renderer pause/drain을 추가했습니다.
