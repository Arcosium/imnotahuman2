# 아임 낫 어 휴먼 2 · 소거 위원회

AI 위원회에 인간 한 명이 잠입하는 1인 심리전 로그라이크다. 7일 동안 살아남으며 생존자의 40% 이상을 도시 밖으로 구출한다. 시연 계정은 고정 구성의 3일판으로 접속한다.

- 서비스: https://imnotahuman2.ai-ve.uk
- [설계서](docs/DESIGN.md)
- [상세 기술설명서](docs/TECHNICAL.md)
- [운영·시연 안내](docs/OPERATIONS.md)
- [디자인 검증](docs/DESIGN-QA.md)

## 실행

Node.js 24 이상을 사용한다. 서버가 `node:sqlite`를 사용한다.

```bash
npm ci
npm run build
npm test
npm start
```

서버 환경 파일에 `CROCHE_PROJECT_KEY`, `CROCHE_SERVER_KEY`를 설정한다. 비밀 파일과 `data/` 원본은 vault에 두고 프로젝트에서는 Git이 무시하는 심링크로 연결한다. 계정 키는 CLI 로그인에만 사용한다. 앱에는 넣지 않는다. 서버 키가 없으면 정형 응답으로 진행하며 화면에 대체 진행 상태를 표시한다.

`npm run dev`는 Vite 개발 화면을 열며 `/api`를 8682 서버로 전달한다. 서버는 별도로 실행해야 한다. 기본 주소는 `http://127.0.0.1:8682`다.

## 구성

| 경로 | 역할 |
|---|---|
| `src/main.tsx`, `src/style.css` | 반응형 게임 화면 |
| `server/engine.mjs` | 상태 전이·의심·투표·모듈·결말 |
| `server/ai.mjs` | Croche 위원·EVE·도구·사용량 |
| `server/store.mjs` | SQLite 계정·세션·판·사용량 |
| `server/index.mjs` | HTTP 인증·검증·작업 잠금 |
| `server/content.mjs` | 위원·구역·사건·모듈·가면 |
| `tests/` | 규칙과 HTTP 회귀 검사 |
| `scripts/create-demo.mjs` | 시연 계정 생성, 비밀번호는 비공개 파일에만 기록 |
| `scripts/croche-smoke.mjs` | 실제 SDK 응답·기록 조회·비용 확인 |
| `deploy/` | 전용 서비스 설정 |

## 이미지와 글꼴

배경은 로컬 Qwen-Image 2.1 모델로 제작했다. 글꼴은 SIL Open Font License의 Pretendard다. 저장소 복사 정책상 바이너리 자산은 Git 검사 경로에 넣지 않는다. 빌드 전에 `scripts/fetch-assets.mjs`가 서비스의 자산을 내려받고 `assets.manifest.json`의 SHA-256과 크기를 확인한다. 이미 같은 파일이 있으면 네트워크를 사용하지 않는다. 다른 기존 파일은 덮어쓰지 않는다. 원본 이미지와 글꼴·라이선스는 작업 프로젝트와 vault 보관본에 남는다.

## 현재 범위

7일 일반판, 3일 시연판, 위원 7종과 등급별 5·6·7명 구성, 사건 6종, 모듈 12종, 가면 4종, 일일 도전, EVE 기억, 기록 다운로드를 구현했다. 가면은 플레이 기록으로 해금한다. 결제와 광고 송출은 연결하지 않았다.

LLM의 발언과 판단은 매번 달라질 수 있다. 의심 변화와 실제 작전·폐기는 서버 규칙으로 제한한다. 사용량 수치는 Croche SDK 보고를 구분해 표시하며 장애나 제한이 발생하면 게임 규칙과 정형 문장으로 이어간다.
