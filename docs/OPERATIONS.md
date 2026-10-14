# 운영·시연 안내

## 접속

사이트는 https://imnotahuman2.ai-ve.uk 이다. 일반 사용자는 ‘계정 만들기’에서 영문·숫자·밑줄로 된 아이디와 10자 이상의 비밀번호를 정한다. 일반 계정은 7일판이며 진행은 로그인한 계정에 저장된다.

시연 아이디는 `demo`다. 비밀번호는 공개 문서나 저장소에 적지 않는다. 서버의 `vault/imnotahuman2/data/demo-access.txt`에서 확인한다. 같은 아이디로 새로 로그인할 때마다 별도 3일판이 생긴다. 시연 중 창을 새로고침하면 현재 세션의 판을 이어 간다. 로그아웃한 뒤 다시 로그인하면 새 시연 세션이다.

## 3일 시연 동선

1. 시연 계정으로 로그인하고 A 또는 B 구성을 고른다.
2. 불씨 무전에서 빈 구역을 확인한다. 센서값과 실제 생존자 위치는 다르다.
3. 보고 확인 후 EVE의 의도 버튼으로 초안을 받는다. 고치거나 직접 입력하고 발언한다.
4. 위원 5명의 답변과 의심 사유를 확인한다. 토론 종료 후 수색할 구역에 투표한다.
5. 수색 결과와 심의 대상을 확인한다. 변론을 쓰고 최종 심의를 진행한다.
6. 살아남으면 잡음 주입·기록 위조·예산 교란 중 하나를 고른다. 다음 날 직접 사용해 효과를 보여 준다. 기록 위조는 오늘 내 제안을 낸 뒤 사용한다.
7. 3일차 결말과 구출 인원을 확인한다. 회선 사용 기록은 결말에서 펼쳐 볼 수 있다. 기록 JSON을 내려받을 수 있다.

실제 AI 결과는 달라진다. 같은 시연 구성도 항상 같은 판결을 보장하지 않는다. 대체 진행 표시가 나오면 회선 상태를 확인하고 기록과 게임 흐름은 계속 진행한다. 장애 시에는 보관한 시연 영상을 사용할 수 있다.

## 생존자 이야기와 기록 인용

업데이트 뒤 새로 시작한 판에는 윤서·태오·미루의 무전이 나온다. 이미 진행 중이던 판은 기존 기록을 보존하며 다음 판부터 적용한다. 보고 화면의 ‘불씨의 목소리’에서 다른 목소리를 펼쳐 보고, 수색 뒤에는 누가 다시 응답하는지 확인한다. 결말에서 인물별 마지막 소식을 읽는다. 작전실의 ‘지난 잠입의 결말과 무전 보기’로 다시 열 수 있다. 시연 계정은 같은 로그인 세션 안에서만 이전 판을 이어 본다.

무전은 비밀 채널이며 위치를 공개하지 않는다. EVE를 넘겨도 불씨의 연락은 이어진다. 플레이어가 폐기되거나 철수한 경우에는 남은 인물의 행방을 미확인으로 표시한다.

토론·변론 중 ‘기록 보관소’ 또는 ‘전체 대화 기록’에서 ‘입력란에 인용’을 누르면 기존 초안 뒤에 인용문이 붙는다. 자신의 반박을 덧붙이고 직접 제출한다. 600자 한도를 넘으면 입력을 먼저 정리한다. 인용의 성공이 위원의 동의를 보장하지 않는다.

## 공동 시연과 일일 도전

시연 계정은 세션마다 24시간 동안 20판을 생성할 수 있다. 성공한 로그인은 실패 시도 제한에 합산하지 않는다. 같은 IP의 로그인 요청은 10분에 120회, 실패는 15회까지 허용한다. 행사에서 한 IP를 공유해도 정상 접속 15회만으로 차단되지 않는다. 전역 AI 지출 한도와 동시 작업 8개 제한은 유지한다.

일일 도전 기록은 시작한 한국 날짜에 귀속한다. 대체 진행이 발생한 판은 순위에서 제외되며 다시 도전할 수 있다. 시연 계정은 순위에 들어가지 않는다.

## 서버 명령

```bash
cd ~/projects/imnotahuman2
npm ci
npm run check
npm test
npm run build
XDG_RUNTIME_DIR=/run/user/1000 systemctl --user status imnotahuman2
```

변경을 배포할 때 신규 서비스의 재시작 권한을 확인한 뒤 실행한다. ArcAI.ve나 전작을 재시작할 필요는 없다.

```bash
XDG_RUNTIME_DIR=/run/user/1000 systemctl --user restart imnotahuman2
curl -fsS http://127.0.0.1:8682/api/health
curl -fsS https://imnotahuman2.ai-ve.uk/api/health
```

환경 파일 원본은 `~/vault/imnotahuman2/.env`다. 키 값을 로그나 채팅에 출력하지 않는다.

| 변수 | 기본값·용도 |
|---|---|
| `CROCHE_PROJECT_KEY` | Studio 프로젝트의 공개 키 |
| `CROCHE_SERVER_KEY` | 서버 전용 인증, 브라우저에 전달 금지 |
| `CROCHE_MODEL` | `deepseek/deepseek-v4.1-flash` |
| `PORT` | 8682 |
| `DATA_DIR` | 프로젝트 `data` 링크 |
| `RUN_BUDGET_USD` | 0.5, 다음 AI 작업의 중단 기준 |
| `DAILY_AI_BUDGET_USD` | 5, 한국 날짜 기준 서버 전체 중단 기준 |
| `AI_OFFLINE` | 1이면 SDK 호출 없이 정형 응답으로 검사 |

시연 계정을 처음 만들 때 `node scripts/create-demo.mjs`를 실행한다. 이미 있으면 보존하며 비밀번호를 다시 생성하지 않는다. 자동 검사도 운영 계정 비밀번호를 변경하지 않는다.

## Croche 확인

CLI 로그인은 사용자가 직접 `croche login`을 실행한다. 계정 키를 SDK 환경 파일에 넣지 않는다. 연결 뒤 에이전트는 프로젝트와 사용량 메타데이터만 확인한다.

```bash
croche auth whoami
croche projects list
node --env-file=.env scripts/croche-smoke.mjs
```

실제 smoke는 모델을 호출하므로 비용이 발생한다. 현재 연결과 사용량은 Studio의 Monitoring → Logs·Activity와 Settings → Budget & limits에서 확인한다. UI 비용은 SDK 보고값이며 Studio의 백그라운드 수집과 시차가 생길 수 있다.

## 백업·복사·GitHub

수정 전 현재 파일과 시각을 확인하고 vault의 날짜별 history에 백업한다. 실행 중인 SQLite 파일을 이동하거나 덮어쓰지 않는다. DB 복구·보관에는 SQLite backup API를 사용한다.

```bash
python3 ~/projects/ArcAI.ve/project_copies.py sync --project imnotahuman2
python3 ~/projects/ArcAI.ve/project_copies.py verify --project imnotahuman2
python3 ~/projects/ArcAI.ve/project_copies.py upload --project imnotahuman2
```

GitHub에는 검사된 복사본만 올린다. projects에서 직접 push하거나 검사 보류 파일을 우회하지 않는다. 자산은 manifest의 해시로 내려받으며 비밀·DB·브라우저 인증 상태는 저장소에 포함하지 않는다.

## 장애 확인

| 증상 | 확인 |
|---|---|
| 사이트 502 | 전용 서비스 상태와 loopback health, 해당 호스트의 터널 경로 |
| Croche 대체 진행 | SDK 서버 키, Studio의 프로젝트 접근·예산, 요청 한도 |
| 오래된 선택 409 | 다른 탭 또는 중복 클릭, 최신 게임을 다시 읽기 |
| 입력 제한 429 | 해당 요청 제한의 만료까지 기다리기 |
| 이미지 없음 | `npm run assets`의 해시 검사와 자산 URL |
| 다른 사람과 시연이 섞임 | 같은 브라우저 쿠키를 공유했는지 확인, 각 기기에서 별도 로그인 |

전체 서버 설정을 초기화하거나 기존 서비스 경로를 바꾸지 않는다. 도메인을 철거할 때도 해당 호스트의 ingress와 DNS만 다룬다. 배선 전후 기록은 `vault/imnotahuman2/wiring/`에 보관돼 있다.
