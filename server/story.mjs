import {createHash} from 'node:crypto';

// Authored private radio. These people are members of existing zone populations,
// not extra survivors. Their hidden assignments never enter council context.
const VOICES = [
  {
    id:'yunseo', name:'윤서', role:'수선공',
    hello:'윤서예요. 코트 안감에 파란 실을 꿰매 뒀어요. 방벽 밖에서 만나면 이걸로 알아봐 줘요.',
    waiting:[
      '어젯밤엔 코트의 뜯어진 데를 마저 꿰맸어요. 입고 나갈 수 있을 거라고 생각하면서요.',
      '실을 조금 남겼어요. 밖에서도 누군가는 옷을 고쳐 입겠죠.',
      '여기선 바늘 떨어지는 소리도 커요. 손바닥 위에 천을 놓고 꿰매고 있어요.',
      '주머니에 손이 들어갈 만큼은 고쳤어요. 오늘 밤도 이 옷을 덮고 잘 거예요.',
      '파란 실이 손톱만큼 남았어요. 마지막 매듭은 밖에서 지으려고요.',
    ],
    departure:'코트를 입었어요. 파란 실이 보이게 소매를 접었고요. 방벽이 열리면 나갈게요.',
    safe:'수색 소리가 멀어졌어요. 바늘을 다시 들었어요. 오늘 밤은 이 옷을 마저 고칠 수 있겠네요.',
    shaken:'우리는 아직 여기 있어요. 끊긴 회선을 기다리다 바늘을 놓쳤어요. 조금 있다 다시 부를게요.',
    escaped:'넘어왔어요. 소매의 파란 실 보이나요? 밖은 생각보다 춥네요. 그래도 이제 걸어도 돼요.',
    left:'아직 안쪽이에요. 순찰 때문에 움직이지 못했어요. 코트는 입고 있어요. 회선이 닿으면 다시 불러 줘요.',
    memory:'소매에 꿰맨 파란 실을 알아봐 달라고 했다.',
  },
  {
    id:'taeo', name:'태오', role:'수리공',
    hello:'태오입니다. 이 무전기, 제가 고쳤어요. 송신 버튼이 잘 안 돌아와서 말을 끝내고 두 번 두드려야 해요.',
    waiting:[
      '밤새 버튼을 손봤어요. 이제 한 번만 눌러도 돌아와요. 오래 얘기할 배터리는 없지만요.',
      '고장 난 시계를 하나 주웠어요. 밖에 나가면 시간을 맞춰 보려고요.',
      '무전기 나사 하나를 잃어버렸어요. 소매 단추로 버티고 있어요. 아직 잘 들리죠?',
      '시계는 아직 멈춰 있어요. 오늘은 무전기부터 챙겼어요. 연락이 먼저니까요.',
      '안테나를 접었다 폈다 했어요. 들고 뛰어도 부러지지 않을 것 같아요.',
    ],
    departure:'무전기와 시계만 챙겼어요. 넘어가면 제가 먼저 송신할게요. 두 번 두드리는 소리를 들어 줘요.',
    safe:'수색이 지나갔어요. 무전기는 안 껐어요. 누가 부르면 바로 대답하려고요.',
    shaken:'여긴 아직 송신돼요. 돌아오지 않는 목소리가 있어요. 주파수를 다시 맞춰 보고 있어요.',
    escaped:'태오입니다. 넘어왔어요. 똑, 똑. 들렸죠? 이제 시계를 맞출 수 있겠어요.',
    left:'순찰이 길을 막았어요. 아직 못 넘었어요. 무전기는 켜 둘게요. 똑, 똑.',
    memory:'무전기의 송신 버튼을 두 번 두드리곤 했다.',
  },
  {
    id:'miru', name:'미루', role:'기록원',
    hello:'미루예요. 작은 수첩에 들은 이름들을 적고 있어요. 네 이름은 아직 몰라서 한 줄을 비워 뒀어요.',
    waiting:[
      '수첩을 다시 읽었어요. 내일도 대답해 줄 목소리라고 생각하니 이름이 다르게 보여요.',
      '연필이 짧아졌어요. 그래도 빈 줄은 남겨 뒀어요. 나중에 직접 적어 줘요.',
      '종이가 구겨질까 봐 옷 안에 넣었어요. 외운 이름도 가끔 다시 들여다봐요.',
      '오늘은 이름 옆에 목소리를 적었어요. 낮게 웃는 사람, 끝말을 삼키는 사람.',
      '수첩 첫 장에 날짜를 쓰려다 말았어요. 밖에 나가는 날부터 다시 세려고요.',
    ],
    departure:'수첩을 품에 넣었어요. 방벽 밖에서 기다릴게요. 비워 둔 한 줄은 네 거예요.',
    safe:'아직 여기에 있어요. 수첩에 오늘도 대답했다고 적었어요. 내일도 그렇게 적고 싶어요.',
    shaken:'우리 목소리는 닿고 있어요. 대답이 끊긴 이름은 지우지 않았어요. 그대로 둘 거예요.',
    escaped:'밖이에요. 수첩도 가져왔어요. 이제 네 이름을 물어봐도 될까요?',
    left:'순찰 때문에 방벽 앞에서 멈췄어요. 아직 안쪽이에요. 수첩의 빈 줄은 그대로 남겨 둘게요.',
    memory:'수첩에 당신의 이름을 적을 한 줄을 비워 두었다.',
  },
];
const voice = id => VOICES.find(v=>v.id===id);
const rank = (seed,key) => createHash('sha256').update(`${seed}:story:${key}`).digest('hex');

function entry(g,contact,kind,text,spoken=true) {
  const key=`${g.day}:${kind}:${contact.id}`;
  if(g.story.entries.some(e=>e.key===key))return;
  g.story.entries.push({id:`S${String(g.story.entries.length+1).padStart(3,'0')}`,key,day:g.day,contact:contact.id,kind,text,spoken});
  if(spoken)contact.lastHeardDay=g.day;
}

export function createStory(g) {
  const occupied=g.zones.filter(z=>z.people>0).sort((a,b)=>rank(g.seed,a.id).localeCompare(rank(g.seed,b.id)));
  g.story={version:1,contacts:VOICES.slice(0,occupied.length).map((v,i)=>({id:v.id,name:v.name,role:v.role,zone:occupied[i].id,slot:0,status:'alive',lastHeardDay:0})),entries:[]};
}

export function storyMorning(g) {
  if(!g.story)return; // Old saved runs keep their original history.
  for(const c of g.story.contacts) {
    if(c.status!=='alive')continue;
    const v=voice(c.id);
    const text=g.day===1?v.hello:g.day===g.days?v.departure:v.waiting[(g.day-2)%v.waiting.length];
    entry(g,c,'morning',text);
  }
}

export function storyLoss(g,zone,cause) {
  if(!g.story)return;
  for(const c of g.story.contacts.filter(c=>c.zone===zone&&c.status==='alive')) {
    c.status='lost';c.lostDay=g.day;
    entry(g,c,'lost',`${cause==='trace'?'거점을 미끼로 내준':'청소부가 수색한'} 뒤 ${c.name}의 회신이 끊겼다. ${voice(c.id).memory}`,false);
  }
}

export function storyAfterSearch(g,zone,casualties,rescued=0) {
  if(!g.story)return;
  const affected=new Set();
  for(const c of g.story.contacts.filter(c=>c.zone===zone&&c.status==='alive')){
    affected.add(c.id);
    if(rescued>0){c.status='rescued';c.rescuedDay=g.day;entry(g,c,'after-search',voice(c.id).safe);}
    else{c.status='lost';c.lostDay=g.day;entry(g,c,'lost',`${c.name}의 회신이 수색 현장에서 끊겼다. ${voice(c.id).memory}`,false);}
  }
  for(const c of g.story.contacts.filter(c=>c.status==='alive'&&!affected.has(c.id)))entry(g,c,'after-search',voice(c.id)[casualties?'shaken':'safe']);
}

export function storyEnding(g,why) {
  if(!g.story)return;
  // Select precisely rescued people from the existing living population with an
  // independent seed. This assigns names to the outcome without changing it.
  const newlyEscaped=why==='escape'?Math.floor(g.zones.reduce((n,z)=>n+z.people,0)*Math.max(0,1-g.patrol+(g.eveProtected?0.15:0))):0;
  const escaped=new Set(why==='escape'?g.zones.flatMap(z=>Array.from({length:z.people},(_,slot)=>`${z.id}:${slot}`))
    .sort((a,b)=>rank(g.seed,`escape:${a}`).localeCompare(rank(g.seed,`escape:${b}`))).slice(0,newlyEscaped):[]);
  for(const c of g.story.contacts) {
    const v=voice(c.id);
    if(c.status==='lost') {
      entry(g,c,'ending',`${c.lostDay}일차에 끊긴 회선은 끝내 돌아오지 않았다. ${v.memory}`,false);
    } else if(c.status==='rescued') {
      c.status=why==='escape'?'escaped':'left';
      entry(g,c,'ending',v[c.status]);
    } else if(why==='escape') {
      c.status=escaped.has(`${c.zone}:${c.slot}`)?'escaped':'left';
      entry(g,c,'ending',v[c.status]);
    } else {
      c.status='unknown';
      entry(g,c,'ending',`${why==='disposed'?'당신의 가면이 폐기되며':'당신이 회선을 닫으며'} 연락이 멎었다. ${c.name}의 마지막 무전은 ${c.lastHeardDay}일차에 남아 있다. 그 뒤의 행방은 확인되지 않았다.`,false);
    }
  }
}

export function publicStory(g) {
  if(!g.story)return null;
  return {
    contacts:g.story.contacts.map(({id,name,role,status,lastHeardDay})=>({id,name,role,status,lastHeardDay})),
    entries:g.story.entries.map(({id,day,contact,kind,text,spoken})=>({id,day,contact,kind,text,spoken})),
  };
}
