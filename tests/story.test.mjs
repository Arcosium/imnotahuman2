import test from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../server/engine.mjs';
import {storyMorning} from '../server/story.mjs';
import {councilContext,councilRecords,GameAI} from '../server/ai.mjs';
import {EVENTS} from '../server/content.mjs';

const make=(seed='voices')=>e.newGame({demo:true,seed});
function search(g,zone=g.missionZone) {
  g.missionZone=zone;
  e.beginDiscussion(g);
  e.addSpeech(g,`${g.day}일차 수치 대조와 검증을 위해 지정 구역 수색을 제안합니다.`,zone);
  e.prepareOperation(g);
  for(const c of g.council)g.preferences[c.id]='rush';
  e.executeSearch(g,'rush');
}
function nextDay(g) {
  // Isolate story transitions from disposal; AI judgment is tested separately.
  for(const row of Object.values(g.suspicion))for(const id of Object.keys(row))row[id]=20;
  g.nominee=e.nominee(g);e.finishVerdict(g);
  if(g.phase==='reward')e.takeReward(g,g.offers[0]);
}

test('인물은 기존 생존 인원에 속하며 배치가 재현되고 빈 거점에는 없음',()=>{
  const a=make(),b=make();assert.equal(a.story.contacts.length,3);
  assert.deepEqual(a.story,b.story);
  assert.equal(new Set(a.story.contacts.map(c=>c.zone)).size,3);
  for(const c of a.story.contacts)assert.ok(a.zones.find(z=>z.id===c.zone).people>c.slot);
  assert.equal(e.living(a),140);assert.equal(a.total,140);
  assert.equal(a.story.entries.length,3);
});

test('비밀 인물 위치와 슬롯은 응답·내보내기 DTO, 위원 문맥·기록에서 제외',()=>{
  const g=make(),out=e.publicGame(g);
  assert.equal(out.zones.filter(z=>z.people===null).length,4);
  for(const c of out.story.contacts){assert.equal(c.zone,undefined);assert.equal(c.slot,undefined);}
  for(const row of out.story.entries){assert.equal(row.key,undefined);assert.equal(row.zone,undefined);}
  for(const payload of [councilContext(g),councilRecords(g),g.records,g.messages]) {
    const text=JSON.stringify(payload);
    for(const c of g.story.contacts)assert.ok(!text.includes(c.name));
  }
  out.story.contacts[0].status='escaped';assert.equal(g.story.contacts[0].status,'alive');
});

test('부분 구출된 인물은 다음 날 중복 배정되지 않고 결말까지 구출 상태를 보존',()=>{
 const g=make(),person=g.story.contacts[0];search(g,person.zone);
 assert.equal(person.status,'rescued');assert.ok(g.rescued>0&&g.lost>0);
 const count=g.story.entries.filter(x=>x.contact===person.id&&x.spoken).length;
 nextDay(g);assert.equal(g.story.entries.filter(x=>x.contact===person.id&&x.spoken).length,count);
 e.endGame(g,'escape');assert.equal(person.status,'escaped');
 assert.equal(g.story.entries.filter(x=>x.kind==='ending').length,3);
});
test('현장은 비어 있으면 살아 있는 현장으로 보정되며 인원 보존',()=>{
 const g=make(),empty=g.zones.find(z=>z.people===0).id;search(g,empty);
 assert.notEqual(g.operation.zone,empty);assert.equal(e.living(g)+g.lost+g.rescued,g.total);
});
test('거점 희생은 해당 인물에게 반영되며 EVE 양도는 생존자 무전과 별개',()=>{
  for(const surrender of [false,true]) {
    const g=make(),person=g.story.contacts[1];g.event=EVENTS.find(x=>x.id==='trace');g.eventResolved=false;
    e.resolveEvent(g,surrender?'surrender':person.zone);
    if(surrender){assert.equal(g.eve,false);assert.ok(g.story.contacts.every(c=>c.status==='alive'));}
    else{assert.equal(person.status,'lost');assert.match(g.story.entries.at(-1).text,/미끼로/);}
    assert.equal(e.living(g)+g.lost,g.total);
  }
});

test('전원 구출·부분 구출·구출 0명의 이름별 운명이 실제 인원과 양립하고 재현됨',()=>{
  let observedLeft=false;
  for(let n=0;n<20;n++)for(const patrol of [0,0.15,0.9,1]) {
    const g=make(`escape-${n}`);g.exitRisk=patrol;
    const copy=JSON.parse(JSON.stringify(g));e.endGame(g,'escape');e.endGame(copy,'escape');
    assert.deepEqual(g.story,copy.story);
    const escaped=g.story.contacts.filter(c=>c.status==='escaped').length;
    const left=g.story.contacts.filter(c=>c.status==='left').length;
    assert.equal(escaped+left,3);assert.ok(escaped<=g.rescued);assert.ok(left<=e.living(g)-g.rescued);
    if(patrol===0)assert.equal(escaped,3);
    if(patrol===1)assert.equal(escaped,0);
    if(patrol===0.15&&left)observedLeft=true;
    assert.equal(g.rescued,Math.floor(140*(1-patrol)));
  }
  assert.ok(observedLeft);
  const g=make();g.exitRisk=.15;g.eveProtected=true;e.endGame(g,'escape');assert.ok(g.story.contacts.every(c=>c.status==='escaped'));
});

test('폐기·철수 후에도 이미 구출한 인원은 유지하고 나머지 행방은 미확인',()=>{
 for(const why of ['disposed','abandoned']){
  const g=make();search(g,g.story.contacts[0].zone);const rescued=g.rescued;e.endGame(g,why);
  assert.equal(g.rescued,rescued);assert.equal(g.story.contacts[0].status,'escaped');
  assert.ok(g.story.contacts.slice(1).every(c=>c.status==='unknown'));
 }
});
test('3일 무전은 새 이야기가 이어지고 저장 복원·중복 처리에도 과거 기록 보존',()=>{
  let g=e.newGame({seed:'seven-voices'});
  const opening=structuredClone(g.story.entries);
  for(let day=1;day<=3;day++) {
    const count=g.story.entries.length;storyMorning(g);assert.equal(g.story.entries.length,count);
    if(!g.eventResolved)e.resolveEvent(g,g.event.id==='trace'?'surrender':'oppose');
    search(g,g.missionZone);nextDay(g);
    g=JSON.parse(JSON.stringify(g));
  }
  assert.equal(g.phase,'ended');assert.deepEqual(g.story.entries.slice(0,3),opening);
  const mornings=g.story.entries.filter(x=>x.contact==='yunseo'&&x.kind==='morning');
  assert.ok(mornings.length>=1&&mornings.length<=3);assert.equal(new Set(mornings.map(x=>x.text)).size,mornings.length);
  assert.ok(g.story.contacts.every(c=>c.status==='escaped'));
});

test('이전 저장판에는 새로운 과거 무전을 소급 생성하지 않음',()=>{
  const g=make();delete g.story;assert.equal(e.publicGame(g).story,null);
  search(g,'plant');nextDay(g);assert.equal(g.story,undefined);
  e.abandon(g);assert.equal(e.publicGame(g).story,null);
});

test('AI의 서로 다른 찬반·의심 판단은 서사와 무관하게 그대로 적용',async()=>{
  const outcomes=[];
  for(const direction of ['up','down']) {
    const g=make();e.beginDiscussion(g);const rec=e.addSpeech(g,'같은 근거의 발전소 수색을 제안합니다.','plant');
    const ai=new GameAI({dataDir:'/unused',recordUsage:()=>{},available:()=>true});
    ai.withProject=async(owner,game,fn)=>fn({});
    ai.request=async(p,game,id,text,ctx)=>{
      assert.equal(ctx.story,undefined);
      return JSON.stringify({text:'이번 기록에 대한 판단입니다.',plan:direction==='up'?'rush':'wait',evaluations:[{observer:id,target:'player',direction,level:'medium',record:rec.id,reason:'위원의 판단'}]});
    };
    await ai.discuss('isolated',g,rec);outcomes.push([g.preferences.audit,g.suspicion.audit.player]);
  }
  assert.deepEqual(outcomes,[['rush',29],['wait',19]]);
});
