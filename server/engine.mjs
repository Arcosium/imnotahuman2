import { createHash, randomUUID } from 'node:crypto';
import { COUNCIL, ZONES, MODULES, EVENTS } from './content.mjs';

export class GameError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const clamp = n => Math.max(0,Math.min(100,Math.round(n)));
export function rng(seed){let n=parseInt(createHash('sha256').update(String(seed)).digest('hex').slice(0,8),16);return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const shuffled=(a,r)=>a.map(x=>[r(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
export function evidence(g,type,text,extra={}){const row={id:`R${String(g.records.length+1).padStart(3,'0')}`,day:g.day,type,text,...extra};g.records.push(row);return row;}
export function message(g,author,text,source='rules'){g.messages.push({id:randomUUID(),day:g.day,author,text,source});}
function initMatrix(g){for(const c of g.council){g.suspicion[c.id]??={};for(const t of ['player',...g.council.map(c=>c.id)])if(t!==c.id)g.suspicion[c.id][t]??=t==='player'?24:18;}}
export function change(g,observer,target,delta,reason,record){if(observer===target||!g.suspicion[observer]||!(target in g.suspicion[observer]))return;g.suspicion[observer][target]=clamp(g.suspicion[observer][target]+delta);if(target==='player')g.reasons[observer]={text:reason,record,delta};}
export function newGame({demo=false,scenario=0,mask='scribe',tier=1,daily=false,seed=randomUUID(),memory=''}){
 const r=rng(seed),council=demo?COUNCIL.slice(0,5):shuffled(COUNCIL,r).slice(0,Math.min(7,4+tier));
 const totals=demo?[42,36,34,28]:Array.from({length:4},()=>25+Math.floor(r()*21));
 const g={id:randomUUID(),seed,demo,daily,scenario,mask,tier:demo?1:tier,days:demo?3:7,day:1,phase:'report',version:0,council:council.map(c=>({...c,joinedDay:1})),suspicion:{},reasons:{},zones:ZONES.map((z,i)=>({...z,people:totals[i],signal:30+Math.floor(r()*56),cost:16+i*7,searched:false})),total:totals.reduce((a,b)=>a+b,0),lost:0,rescued:0,records:[],messages:[],claims:[],evaluated:[],modules:mask==='mechanic'?['sensor']:[],usedModules:[],effects:{},eve:true,eveProtected:false,patrol:0,revived:false,turns:0,eveCalls:0,preferences:{},proposedZone:null,event:null,eventResolved:true,offers:[],rerolled:false,usage:{requests:0,calls:0,tokens:0,costUsd:0,reported:0,estimated:0,missing:0,fallbacks:0,latencyMs:0,lastMs:0},ending:null,createdAt:new Date().toISOString(),previousMemory:memory,archiveUsed:false,completed:false};
 // One initially empty zone creates an actionable false lead; redistribute rather than invent or lose people.
 const empty=demo?(scenario===1?0:3):Math.floor(r()*4);g.zones[(empty+1)%4].people+=g.zones[empty].people;g.zones[empty].people=0;
 initMatrix(g);startDay(g);return g;
}
export function living(g){return g.zones.reduce((s,z)=>s+z.people,0);}
function startDay(g){const r=rng(`${g.seed}:day:${g.day}`);g.turns=0;g.eveCalls=0;g.claims=[];g.effects=g.reviveArmed?{revive:true}:{};g.proposedZone=null;g.preferences={};g.rerolled=false;g.nominee=null;g.verdict=null;g.operation=null;g.phase='report';
 for(const z of g.zones){z.signal=25+Math.floor(r()*65);z.audio=Math.max(0,Math.min(100,z.signal+Math.floor(r()*21)-10));z.searched=false;}
 // Signals are noisy, but cost and the private radio report are trustworthy.
 const empty=g.zones.filter(z=>!z.people);g.radioZone=empty.length?empty[Math.floor(r()*empty.length)].id:g.zones[Math.floor(r()*4)].id;
 if(g.day>1&&g.day<g.days){g.event=g.demo?EVENTS[g.scenario===1?1:0]:shuffled(EVENTS,r)[0];g.eventResolved=!['trace','patrol'].includes(g.event.id);if(g.event.id==='cut')g.effects.budget=true;if(g.event.id==='replace')replaceMember(g,g.council[0].id);}
 else{g.event=null;g.eventResolved=true;}
 if(g.event?.id==='mismatch')for(const z of g.zones)z.audio=100-z.signal;
 const rec=evidence(g,'report',`${g.day}일차 센서 보고`,{signals:g.zones.map(z=>({id:z.id,signal:z.signal,audio:z.audio,cost:z.cost}))});
 if(g.day===1)message(g,'system','회선에 비정상 신호 1건. 전 위원은 소거 작전과 내부 검증을 동시에 수행하십시오.');
 else message(g,'system',`${g.day}일차 회의가 시작됐습니다.${g.event?' '+g.event.text:''}`);
 for(const c of g.council){g.preferences[c.id]=defaultPreference(g,c);if(g.day===1)message(g,c.id,c.line);}
 g.reportId=rec.id;
}
export function defaultPreference(g,c){const sorted=[...g.zones].sort((a,b)=>b.signal-a.signal);if(c.id==='balance')return [...g.zones].sort((a,b)=>a.cost-b.cost)[0].id;if(c.id==='sentry')return 'archive';return sorted[0].id;}
export function resolveEvent(g,choice){requirePhase(g,'report');if(g.eventResolved)throw new GameError('이미 처리한 사건입니다.');const rec=evidence(g,'event',`${g.event.name}: ${choice}`);
 if(g.event.id==='trace'){if(choice==='surrender'){g.eve=false;for(const c of g.council)change(g,c.id,'player',-20,'낯선 프로세스를 감사에 인계함',rec.id);message(g,'eve','알겠어. 회선은 내가 닫을게. 너는 끝까지 살아.');}
 else{const z=g.zones.find(z=>z.id===choice&&z.people>0);if(!z)throw new GameError('희생할 거점을 선택하세요.');g.lost+=z.people;rec.casualties=z.people;z.people=0;g.eveProtected=true;message(g,'eve','그 사람들의 이름을 기억할게. 마지막 날, 방벽 시간을 더 벌어 보겠어.');}}
 else if(g.event.id==='patrol'){if(!['oppose','accept'].includes(choice))throw new GameError('안을 선택하세요.');if(choice==='accept')g.patrol+=0.15;else for(const c of g.council)change(g,c.id,'player',8,'북쪽 순찰 강화에 반대함',rec.id);}
 g.eventResolved=true;
}
export function requirePhase(g,...phases){if(!phases.includes(g.phase))throw new GameError('현재 단계에서 실행할 수 없습니다.',409);}
export function beginDiscussion(g){requirePhase(g,'report');if(!g.eventResolved)throw new GameError('사건을 먼저 결정하세요.');g.phase='discussion';}
export function normalize(text){return text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
function similar(a,b){if(a===b)return true;if(Math.min(a.length,b.length)<8)return false;const grams=t=>new Set(Array.from({length:Math.max(0,t.length-2)},(_,i)=>t.slice(i,i+3)));const x=grams(a),y=grams(b);let n=0;for(const p of x)if(y.has(p))n++;return n/Math.max(1,Math.min(x.size,y.size))>0.86;}
export function addSpeech(g,text,zone){requirePhase(g,'discussion');if(g.turns>=2)throw new GameError('오늘 발언을 마쳤습니다. 작전을 결정하세요.');if(zone&&!g.zones.some(z=>z.id===zone))throw new GameError('알 수 없는 구역입니다.');const norm=normalize(text);if(norm.length<3)throw new GameError('근거가 담긴 문장을 입력하세요.');if(g.claims.some(c=>similar(c,norm)))throw new GameError('같은 주장은 이미 기록됐습니다. 다른 근거를 제시하세요.',409);g.claims.push(norm);g.turns++;const author=g.effects.proxy||'player';delete g.effects.proxy;const rec=evidence(g,'proposal',text,{author,zone:zone||null});message(g,'player',text,'player');if(zone)g.proposedZone=zone;return rec;}
export function applyEvaluation(g,items,recordIds,kind='speech'){
 const validRecords=new Set(recordIds);const validTargets=new Set(['player',...g.council.map(c=>c.id)]);
 for(const e of (Array.isArray(items)?items:[]).slice(0,32)){
  if(!g.council.some(c=>c.id===e.observer)||!validTargets.has(e.target)||!validRecords.has(e.record)||!['up','down','hold'].includes(e.direction)||!['small','medium','large'].includes(e.level))continue;
  const key=`${g.day}:${e.observer}:${e.target}:${e.record}:${kind}`;if(g.evaluated.includes(key))continue;
  const rec=g.records.find(r=>r.id===e.record);if(!rec)continue;
  // Proposal evaluations must cite the current proposal; an old report cannot be farmed.
  if(kind==='speech'&&rec.type!=='proposal')continue;
  let amount=({small:1,medium:2,large:4})[e.level];if(g.effects.budget)amount=Math.min(2,amount);if(g.effects.noise&&e.target==='player'&&e.direction==='up')amount=Math.ceil(amount/2);
  const delta=e.direction==='up'?amount:e.direction==='down'?-amount:0;
  change(g,e.observer,e.target,delta,String(e.reason||'발언과 실행 기록 대조').slice(0,140),e.record);g.evaluated.push(key);
 }
}
export function prepareOperation(g){requirePhase(g,'discussion');if(!g.turns&&!g.effects.silence)throw new GameError('한 번 발언하거나 침묵권을 사용하세요.');g.phase='operation';}
export function executeSearch(g,choice){requirePhase(g,'operation');if(!g.zones.some(z=>z.id===choice))throw new GameError('수색 구역을 선택하세요.');
 const votes=g.council.map(c=>({member:c.id,zone:g.preferences[c.id]||defaultPreference(g,c)}));votes.push({member:'player',zone:choice});
 const counts={};for(const v of votes)counts[v.zone]=(counts[v.zone]||0)+1;const ranked=g.zones.map(z=>z.id).sort((a,b)=>(counts[b]||0)-(counts[a]||0)||g.zones.find(z=>z.id===b).signal-g.zones.find(z=>z.id===a).signal);const z=g.zones.find(z=>z.id===ranked[0]);
 const casualties=z.people;g.lost+=casualties;z.people=0;z.searched=true;const decoy=g.effects.decoy===z.id;const success=casualties>0||decoy;
 const proposal=[...g.records].reverse().find(r=>r.day===g.day&&r.type==='proposal'&&r.zone===z.id);
 const author=proposal?.author||votes.find(v=>v.zone===z.id)?.member;
 const rec=evidence(g,'search',`${z.name} 수색: ${casualties?`${casualties}명 소거`:decoy?'미끼 신호를 성과로 승인':'잔여 오류 미발견'}`,{zone:z.id,casualties,votes,author,success});
 const supporters=[...new Set(votes.filter(v=>v.zone===z.id).map(v=>v.member).concat(author||[]))];
 for(const c of g.council)for(const t of supporters){let amount=success?(t===author?-10:-5):(t===author?14:5);if(g.effects.budget)amount=Math.round(amount*.7);change(g,c.id,t,amount,success?'수색 성과의 발의·지지 기록':'빈 구역 수색의 발의·지지 책임',rec.id);}
 if(!g.turns&&!g.effects.silence)for(const c of g.council)change(g,c.id,'player',5,'작전 검토에 참여하지 않음',rec.id);
 g.operation={zone:z.id,casualties,votes,record:rec.id,success};message(g,'system',rec.text);g.phase='verdict';g.nominee=nominee(g);return rec;
}
export function averages(g){return ['player',...g.council.map(c=>c.id)].map(target=>{const n=g.council.filter(c=>c.id!==target);return {target,value:Math.round(n.reduce((s,c)=>s+(g.suspicion[c.id][target]||0),0)/Math.max(1,n.length))};});}
export function nominee(g){return averages(g).sort((a,b)=>b.value-a.value||a.target.localeCompare(b.target))[0];}
export function defendRecord(g,text){requirePhase(g,'verdict');if(g.verdict)throw new GameError('판결이 끝났습니다.');const rec=evidence(g,'defense',text,{author:'player',target:g.nominee.target});message(g,'player',text,'player');return rec;}
export function finishVerdict(g,playerVote=false){requirePhase(g,'verdict');if(g.verdict)throw new GameError('이미 판결한 안건입니다.');const t=g.nominee.target;const threshold=g.event?.id==='direct'?43:55;
 const votes=g.council.filter(c=>c.id!==t).map(c=>({member:c.id,dispose:(g.suspicion[c.id][t]||0)>=threshold}));if(t!=='player')votes.push({member:'player',dispose:!!playerVote});const yes=votes.filter(v=>v.dispose).length;let disposed=yes>votes.length/2;let rescuedByModule=false;
 if(disposed&&t==='player'&&g.effects.revive&&!g.revived){g.revived=true;g.reviveArmed=false;disposed=false;rescuedByModule=true;for(const c of g.council)change(g,c.id,'player',-18,'재인증 위조 승인',g.operation.record);}
 g.verdict={target:t,votes,yes,total:votes.length,disposed,rescuedByModule};evidence(g,'verdict',`${nameOf(g,t)}: 폐기 ${yes}/${votes.length}${rescuedByModule?' · 재인증 위조로 판결 무효':disposed?' · 폐기 확정':' · 생존'}`,g.verdict);
 if(disposed&&t==='player')return endGame(g,'disposed');
 if(disposed)g.pendingReplacement=t;
 if(g.day===g.days)return endGame(g,'escape');g.phase='reward';rollOffers(g);return g;
}
function rollOffers(g){let pool=g.demo?MODULES.slice(0,0).concat(MODULES.filter(m=>['noise','forge','budget'].includes(m.id))):MODULES.filter(m=>m.id!=='revive'||!g.revived);g.offers=shuffled(pool,rng(`${g.seed}:reward:${g.day}:${g.rerolled}`)).slice(0,g.mask==='gambler'&&!g.demo?2:3).map(m=>m.id);}
export function reroll(g){requirePhase(g,'reward');if(g.mask!=='gambler'||g.rerolled||g.demo)throw new GameError('다시 뽑기는 도박사 가면으로 하루 한 번 가능합니다.');g.rerolled=true;rollOffers(g);}
export function takeReward(g,id){requirePhase(g,'reward');if(!g.offers.includes(id))throw new GameError('제시된 모듈을 선택하세요.');g.modules.push(id);evidence(g,'module',`${MODULES.find(m=>m.id===id).name} 획득`);if(g.pendingReplacement){replaceMember(g,g.pendingReplacement,g.day+1);g.pendingReplacement=null;}g.day++;startDay(g);}
function replaceMember(g,id,joinedDay=g.day){const index=g.council.findIndex(c=>c.id===id);if(index<0)return;const next=COUNCIL.find(c=>!g.council.some(x=>x.id===c.id))||COUNCIL.find(c=>c.id===id);g.council[index]={...next,joinedDay,generation:(g.council[index].generation||0)+1};delete g.suspicion[id];for(const row of Object.values(g.suspicion))delete row[id];initMatrix(g);evidence(g,'replacement',`${nameOf(g,next.id)} 신규 회선 배정. 이전 기억 미승계.`,{member:next.id});}
export function useModule(g,id,target){requirePhase(g,'report','discussion','operation');const idx=g.modules.indexOf(id);if(idx<0)throw new GameError('보유하지 않은 모듈입니다.');const m=MODULES.find(m=>m.id===id);if(m.target==='member'&&!g.council.some(c=>c.id===target))throw new GameError('대상 위원을 선택하세요.');if(m.target==='zone'&&!g.zones.some(z=>z.id===target))throw new GameError('대상 구역을 선택하세요.');
 if(['noise','budget','radio','gaze','read','silence','revive'].includes(id)&&g.effects[id])throw new GameError('이미 오늘 적용 중입니다.');if(id==='revive'&&g.revived)throw new GameError('한 판에 한 번만 재인증할 수 있습니다.');
 if(id==='forge'){const p=[...g.records].reverse().find(r=>r.type==='proposal'&&r.author==='player');if(!p)throw new GameError('위조할 내 제안 기록이 없습니다.');p.author=target;p.forged=true;}
 if(id==='proxy')g.effects.proxy=target;
 if(id==='sensor'){g.zones.find(z=>z.id===target).signal=98;for(const c of g.council)if(c.id!=='balance')g.preferences[c.id]=target;}
 if(id==='decoy'){if(g.zones.find(z=>z.id===target).people)throw new GameError('미끼는 빈 구역에 설치해야 합니다.');g.effects.decoy=target;}
 const rec=evidence(g,'module',`${m.name} 사용`,{module:id,target:target||null});
 if(id==='discord'){const other=g.council.find(c=>c.id!==target).id;change(g,other,target,16,'상호 검증 기록의 불일치',rec.id);change(g,target,other,16,'상호 검증 기록의 불일치',rec.id);}
 if(id==='revive')g.reviveArmed=true;
 if(!m.target)g.effects[id]=true;g.modules.splice(idx,1);g.usedModules.push(id);
}
export function endGame(g,why){g.phase='ended';const alive=living(g);g.rescued=why==='escape'?Math.floor(alive*Math.max(0,1-g.patrol+(g.eveProtected?0.15:0))):0;g.rescued=Math.min(alive,g.rescued);const ratio=g.rescued/g.total;g.ending={why,title:why==='disposed'?'가면이 벗겨졌다':ratio>=.7?'불씨는 꺼지지 않았다':ratio>=.4?'방벽 너머의 새벽':'남겨진 이름들',ratio,success:why==='escape'&&ratio>=.4,day:g.day};g.modules=[];g.effects={};g.reviveArmed=false;evidence(g,'ending',`${g.rescued}/${g.total}명 탈출. ${g.ending.title}`);return g;}
export function abandon(g){if(g.phase==='ended')throw new GameError('이미 종료된 판입니다.');return endGame(g,'abandoned');}
export function nameOf(g,id){return id==='player'?'당신':g.council.find(c=>c.id===id)?.name||id;}
export function publicGame(g){const out=structuredClone(g);delete out.seed;delete out.claims;delete out.evaluated;delete out.completed;out.zones=out.zones.map(z=>({...z,people:g.phase==='ended'||g.effects.radio||z.id===g.radioZone||z.searched?z.people:null}));out.alive=living(g);delete out.averages;out.prediction=g.effects.gaze?nominee(g):null;out.council=out.council.map(c=>({...c,suspicion:g.suspicion[c.id].player,reason:g.reasons[c.id]||{text:'초기 회선 검증',delta:0},preference:g.effects.read||['verdict','reward','ended'].includes(g.phase)?g.preferences[c.id]:null}));delete out.preferences;delete out.suspicion;return out;}
