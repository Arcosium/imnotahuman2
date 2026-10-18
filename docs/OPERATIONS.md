# The Last Vote 운영 안내

운영 주소는 https://thelastvote.ai-ve.uk 이며 GitHub 저장소는 [Arcosium/thelastvote](https://github.com/Arcosium/thelastvote)다. 일반 계정의 한 판은 3일이다. 해커톤 시연 메뉴와 `/demo`, `/api/demo`, `/api/demo/login`은 기본적으로 비활성화돼 있으며 시연 경로는 HTTP 410을 반환한다.

## 실행 경로

| 항목 | 경로·설정 |
|---|---|
| 작업 정본 | `~/projects/thelastvote` |
| 검사된 GitHub 복사본 | `~/github/thelastvote` |
| 비밀·DB·SDK 기억 | `~/vault/thelastvote` |
| 서비스 | `thelastvote.service` · 사용자 systemd |
| 서비스 원본 | `deploy/thelastvote.service` |
| HTTP | `127.0.0.1:8682` |

프로젝트의 `.env`와 `data`는 vault 원본을 가리키는 심링크다. 운영 DB와 환경 파일을 저장소에 복사하지 않는다. 포트와 공개 도메인은 서비스 이름과 별개이므로 배포 때 공유 터널을 재시작할 필요가 없다.

```bash
cd ~/projects/thelastvote
npm ci
npm run check
npm test
npm run build
XDG_RUNTIME_DIR=/run/user/1000 systemctl --user status thelastvote.service
curl -fsS http://127.0.0.1:8682/api/health
```

운영 반영이 승인된 변경은 빌드와 검증을 마친 뒤 게임 서비스만 재시작한다.

```bash
XDG_RUNTIME_DIR=/run/user/1000 systemctl --user restart thelastvote.service
```

## 환경 변수

| 이름 | 용도 |
|---|---|
| `CROCHE_PROJECT_KEY` | Croche 프로젝트 선택 |
| `CROCHE_SERVER_KEY` | 서버에서 사용하는 앱 인증 정보 |
| `HOST`, `PORT` | HTTP 주소와 포트 |
| `DATA_DIR` | DB와 SDK 기억 저장 위치. 기본값은 프로젝트의 `data` |
| `DAILY_AI_BUDGET_USD` | 서버 전체 일일 AI 지출 상한 |
| `AI_OFFLINE=1` | 격리된 테스트에서 실제 AI 호출 비활성화 |
| `ENABLE_HACKATHON_DEMO=1` | 명시적으로 준비한 행사에서만 과거 시연 구현 재활성화 |
| `LEGACY_SESSION_COOKIE`, `LEGACY_DEMO_COOKIE` | 이름 변경 전 쿠키를 정리하는 임시 호환 설정 |

쿠키 이름은 `thelastvote_session`, `thelastvote_demo_session`이다. 호환 설정이 있으면 서버가 DB에서 유효한 일반 세션을 확인한 뒤 새 쿠키로 옮기고 이전 쿠키를 지운다. 새 쿠키에 유효한 세션이 있으면 그 계정을 우선한다. 종료된 시연 세션은 이 과정으로 되살리지 않는다. 계정·비밀번호·진행 기록의 DB 구조는 바뀌지 않는다.

계정 키는 사용자가 Croche CLI 로그인에 직접 입력한다. 서버 키와 계정 키를 혼용하거나 값을 로그에 출력하지 않는다. 환경 파일 원본은 `~/vault/thelastvote/.env`에 둔다.

## AI 연결 확인

게임의 연결 상태와 사용량 표시를 먼저 확인한다. 별도의 연결 검사는 다음 명령을 사용한다.

```bash
node --env-file=.env scripts/croche-smoke.mjs
```

이 검사는 실제 모델을 호출하므로 비용이 발생한다. 화면의 비용은 SDK 보고값이며 집계 시차가 생길 수 있다. 연결 장애와 요청 제한 때는 대체 진행 여부를 함께 확인한다.

## 백업과 GitHub 동기화

수정 전 파일과 수정 시각을 확인하고 vault의 날짜별 history에 백업한다. 열린 SQLite 파일은 이동하거나 덮어쓰지 않는다. DB 보관에는 SQLite backup API를 사용한다.

```bash
python3 ~/projects/ArcAI.ve/project_copies.py sync --project thelastvote
python3 ~/projects/ArcAI.ve/project_copies.py verify --project thelastvote
python3 ~/projects/ArcAI.ve/project_copies.py upload --project thelastvote
```

Git 작업은 검사된 `~/github/thelastvote` 복사본에서 수행한다. `.publish.json`에 기록된 공개 범위와 개인정보·비밀 검사를 지킨다. 이미지·음원·글꼴은 `assets.manifest.json`의 URL, 크기와 SHA-256으로 복원한다.

## 장애 확인

| 증상 | 확인할 곳 |
|---|---|
| 사이트 502 | 게임 서비스 상태, loopback health, 해당 호스트의 터널 경로 |
| AI 대체 진행 | 서버 키, 프로젝트 접근 권한, 예산과 요청 제한 |
| 오래된 선택 409 | 다른 탭의 진행 여부, 최신 게임 상태 |
| 입력 제한 429 | 해당 제한의 만료 시간 |
| 이미지·음원 누락 | `npm run assets`의 해시 검사와 자산 URL |
| 로그인 풀림 | 일반 계정으로 재로그인한 뒤 이어하기 확인 |

공유 터널과 다른 서비스는 게임 배포에 포함하지 않는다. 시작 화면의 영상 오류는 정지 배경으로 대체하며, 사용자와 기기의 움직임 감소 설정을 존중한다.
