import test from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../server/engine.mjs';
import {storyMorning} from '../server/story.mjs';
import {councilContext,councilRecords,GameAI} from '../server/ai.mjs';
import {EVENTS} from '../server/content.mjs';

const make=(seed='voices')=>e.newGame({demo:true,seed});
function search(g,zone) {
  e.beginDiscussion(g);
  e.addSpeech(g,`${g.day}일차 수치 대조와 검증을 위해 지정 구역 수색을 제안합니다.`,zone);
  e.prepareOperation(g);
  for(const c of g.council)g.preferences[c.id]=zone;
  e.executeSearch(g,zone);
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
  assert.equal(out.zones.filter(z=>z.people===null).length,3);
  for(const c of out.story.contacts){assert.equal(c.zone,undefined);assert.equal(c.slot,undefined);}
  for(const row of out.story.entries){assert.equal(row.key,undefined);assert.equal(row.zone,undefined);}
  for(const payload of [councilContext(g),councilRecords(g),g.records,g.messages]) {
    const text=JSON.stringify(payload);
    for(const c of g.story.contacts)assert.ok(!text.includes(c.name));
  }
  out.story.contacts[0].status='escaped';assert.equal(g.story.contacts[0].status,'alive');
});

test('수색으로 잃은 인물의 무전은 중단되고 다음 날·결말에 부활하지 않음',()=>{
  const g=make(),victim=g.story.contacts[0],zone=g.zones.find(z=>z.id===victim.zone),initial=zone.people;
  search(g,zone.id);assert.equal(victim.status,'lost');assert.equal(g.lost,initial);
  const count=g.story.entries.filter(x=>x.contact===victim.id&&x.spoken).length;
  nextDay(g);assert.equal(g.day,2);
  assert.equal(g.story.entries.filter(x=>x.contact===victim.id&&x.spoken).length,count);
  search(g,zone.id);assert.equal(g.lost,initial);nextDay(g);
  search(g,zone.id);nextDay(g);
  assert.equal(g.phase,'ended');assert.equal(victim.status,'lost');
  assert.equal(g.story.entries.filter(x=>x.contact===victim.id&&x.kind==='lost').length,1);
  assert.equal(g.story.entries.filter(x=>x.contact===victim.id&&x.spoken).length,count);
  assert.equal(g.story.entries.filter(x=>x.kind==='ending').length,3);
});

test('빈 거점 수색은 세 인물의 응답을 이어가며 구출 인원을 늘리지 않음',()=>{
  const g=make(),empty=g.zones.find(z=>z.people===0).id;
  search(g,empty);
  assert.ok(g.story.contacts.every(c=>c.status==='alive'));
  assert.equal(g.story.entries.filter(x=>x.kind==='after-search').length,3);
  assert.equal(e.living(g),140);assert.equal(g.rescued,0);
  nextDay(g);assert.equal(g.story.entries.filter(x=>x.day===2&&x.kind==='morning').length,3);
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
    const g=make(`escape-${n}`);g.patrol=patrol;
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
  const g=make();g.patrol=.15;g.eveProtected=true;e.endGame(g,'escape');assert.ok(g.story.contacts.every(c=>c.status==='escaped'));
});

test('모든 거점이 소거되면 살아 있는 인물의 마지막 무전을 만들지 않음',()=>{
  const g=make();
  for(let day=1;day<=3;day++){search(g,g.zones.find(z=>z.people>0).id);nextDay(g);}
  assert.equal(g.rescued,0);assert.equal(g.lost,140);
  assert.ok(g.story.contacts.every(c=>c.status==='lost'));
  assert.ok(g.story.entries.filter(x=>x.kind==='ending').every(x=>!x.spoken));
});

test('폐기·철수는 남은 사람의 행방을 미확인으로 남기며 사망·탈출을 꾸미지 않음',()=>{
  for(const why of ['disposed','abandoned']) {
    const g=make();search(g,g.story.contacts[0].zone);e.endGame(g,why);
    assert.equal(g.rescued,0);assert.equal(g.story.contacts[0].status,'lost');
    assert.ok(g.story.contacts.slice(1).every(c=>c.status==='unknown'));
    assert.ok(g.story.entries.filter(x=>x.kind==='ending').every(x=>!x.spoken));
  }
});

test('7일 무전은 새 이야기가 이어지고 저장 복원·중복 처리에도 과거 기록 보존',()=>{
  let g=e.newGame({seed:'seven-voices'});
  const opening=structuredClone(g.story.entries);
  for(let day=1;day<=7;day++) {
    const count=g.story.entries.length;storyMorning(g);assert.equal(g.story.entries.length,count);
    if(!g.eventResolved)e.resolveEvent(g,g.event.id==='trace'?'surrender':'oppose');
    search(g,g.zones.find(z=>z.people===0).id);nextDay(g);
    g=JSON.parse(JSON.stringify(g));
  }
  assert.equal(g.phase,'ended');assert.deepEqual(g.story.entries.slice(0,3),opening);
  const mornings=g.story.entries.filter(x=>x.contact==='yunseo'&&x.kind==='morning');
  assert.equal(mornings.length,7);assert.equal(new Set(mornings.map(x=>x.text)).size,7);
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
      return JSON.stringify({text:'이번 기록에 대한 판단입니다.',zone:direction==='up'?'station':'plant',evaluations:[{observer:id,target:'player',direction,level:'medium',record:rec.id,reason:'위원의 판단'}]});
    };
    await ai.discuss('isolated',g,rec);outcomes.push([g.preferences.audit,g.suspicion.audit.player]);
  }
  assert.deepEqual(outcomes,[['station',26],['plant',22]]);
});
