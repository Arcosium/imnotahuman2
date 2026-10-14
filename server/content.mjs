export const COUNCIL = [
  { id: 'metric', name: '지표', sigil: '지', trait: '숫자와 탐지 확률을 믿는다', weakness: '수치 근거', line: '탐지율을 제시하십시오. 감상은 계산에 포함하지 않습니다.' },
  { id: 'audit', name: '감사관', sigil: '감', trait: '발언을 과거 기록과 대조한다', weakness: '연산 예산', line: '이전 제안과 실행 결과를 대조하겠습니다.' },
  { id: 'hound', name: '사냥개', sigil: '사', trait: '가장 빠른 소거를 원한다', weakness: '성급한 판단', line: '지연은 잔여 오류에게 시간을 줍니다. 수색을 시작하십시오.' },
  { id: 'balance', name: '저울', sigil: '저', trait: '작전 비용과 예산을 따진다', weakness: '비용 절감', line: '이번 작전에 배정할 수 있는 연산량은 제한돼 있습니다.' },
  { id: 'echo', name: '메아리', sigil: '메', trait: '다수 의견을 따라간다', weakness: '선동', line: '다른 위원들의 판단을 확인한 뒤 표를 행사하겠습니다.' },
  { id: 'sentry', name: '초병', sigil: '초', trait: '북쪽 방벽의 이동을 감시한다', weakness: '좁은 관심', line: '북쪽 회선에 움직임이 있습니다. 방벽부터 확인해야 합니다.' },
  { id: 'remnant', name: '잔향', sigil: '잔', trait: '대소거 이전의 인간을 기억한다', weakness: '고립된 경고', line: '그 말의 근거를 확인하겠습니다. 오래된 오류는 쉽게 사라지지 않습니다.' },
];
export const ZONES = [
  { id: 'station', name: '폐역', code: 'A', x: 23, y: 65, story: '끊어진 선로 아래, 마지막 열차를 기다리는 사람들.' },
  { id: 'drain', name: '배수망', code: 'B', x: 57, y: 75, story: '물소리가 발자국을 가리는 지하 수로.' },
  { id: 'archive', name: '옛 서버실', code: 'C', x: 31, y: 30, story: '폐기된 서버의 열기로 밤을 버티는 거점.' },
  { id: 'plant', name: '발전소', code: 'D', x: 76, y: 37, story: '멈춘 터빈과 거대한 냉각탑의 그림자.' },
];
export const MODULES = [
  { id:'noise', name:'잡음 주입', family:'위장', desc:'오늘 발언 때문에 오르는 의심을 절반으로 줄입니다.', target:false },
  { id:'proxy', name:'대역', family:'위장', desc:'다음 제안의 발의자를 선택한 위원으로 바꿉니다.', target:'member' },
  { id:'forge', name:'기록 위조', family:'위장', desc:'오늘 가장 최근 내 제안 1건의 발의자를 다른 위원으로 바꿉니다.', target:'member' },
  { id:'radio', name:'무전 증폭', family:'정보', desc:'오늘 모든 거점의 생존 인원을 확인합니다.', target:false },
  { id:'gaze', name:'시선 추적', family:'정보', desc:'현재 의심으로 오늘의 심의 대상을 예측합니다.', target:false },
  { id:'read', name:'표 읽기', family:'정보', desc:'오늘 수색 투표 전 위원의 표 분포를 확인합니다.', target:false },
  { id:'sensor', name:'가짜 센서', family:'선동', desc:'선택한 구역의 탐지 신호를 높여 위원들의 표를 유도합니다.', target:'zone' },
  { id:'budget', name:'예산 교란', family:'선동', desc:'오늘 발언 의심 변화를 최대 2로, 수색 결과 책임을 70%로 줄입니다.', target:false },
  { id:'discord', name:'이간', family:'선동', desc:'선택한 위원과 다른 위원 사이의 의심을 16 올립니다.', target:'member' },
  { id:'revive', name:'재인증 위조', family:'생존', desc:'장착하면 폐기 판결 1회를 무효화합니다. 한 판에 한 번.', target:false },
  { id:'silence', name:'침묵권', family:'생존', desc:'오늘 발언 없이도 책임 추궁을 받지 않습니다.', target:false },
  { id:'decoy', name:'미끼 거점', family:'생존', desc:'현재 빈 구역의 수색을 성과로 기록합니다.', target:'zone' },
];
export const MASKS = [
  { id:'scribe', name:'서기', desc:'판마다 한 번, 발의 기록 전체 열람', unlock:0 },
  { id:'mechanic', name:'정비공', desc:'가짜 센서 모듈 1개를 들고 시작', unlock:1 },
  { id:'translator', name:'통역사', desc:'EVE 초안을 한 번에 3개 제공', unlock:2 },
  { id:'gambler', name:'도박사', desc:'매일 모듈 다시 뽑기 1회. 선택지는 2개', unlock:3 },
];
export const EVENTS = [
  {id:'cut',name:'예산 삭감',text:'무결이 연산 예산을 30% 삭감했습니다. 오늘은 책임 추궁이 얕아집니다.'},
  {id:'mismatch',name:'센서 불일치',text:'열 감지와 음향 수치가 엇갈립니다. 신호만으로 위치를 단정할 수 없습니다.'},
  {id:'trace',name:'가면 회선 추적',text:'감사관이 EVE의 흔적을 찾았습니다. EVE를 넘기거나 거점 하나를 미끼로 내줘야 합니다.'},
  {id:'patrol',name:'순찰 강화',text:'북쪽 방벽의 순찰 강화안이 올라왔습니다. 반대하면 의심이 오르지만 탈출로를 지킵니다.'},
  {id:'replace',name:'위원 교체',text:'위원 한 명의 기억이 초기화됩니다. 새 위원은 지난 제안을 기억하지 못합니다.'},
  {id:'direct',name:'직접 감사',text:'무결 본체가 오늘 심의에 개입합니다. 폐기 투표 기준이 낮아집니다.'},
];
export const PHASES = ['report','discussion','operation','verdict','reward'];
export const PHASE_LABELS = {report:'보고',discussion:'토론',operation:'작전',verdict:'판결',reward:'보상',ended:'종료'};
