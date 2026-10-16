import test from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../server/engine.mjs';
import {COUNCIL} from '../server/content.mjs';
import {GameAI} from '../server/ai.mjs';

test('이전 7일 저장판은 기록과 총인원을 보존하며 3일·첫 현장으로 이행',()=>{
 const g=e.newGame({demo:true,seed:'migration'});
 const shelter=g.zones.pop();g.zones[0].people+=shelter.people;
 g.days=7;delete g.missionZone;delete g.exitRisk;g.patrol=.15;
 const records=g.records.length,total=g.total;
 assert.equal(e.migrateGameDuration(g),true);assert.equal(e.migrateTutorialMission(g),true);
 assert.equal(g.days,3);assert.equal(g.missionZone,'shelter');assert.equal(e.living(g),total);assert.equal(g.records.length,records);
 assert.equal(e.migrateGameDuration(g),false);assert.equal(e.migrateTutorialMission(g),false);
 e.beginDiscussion(g);e.addSpeech(g,'기존 보고의 신호 편차를 검증하십시오.');e.prepareOperation(g);e.executeSearch(g,'rush');
 assert.equal(e.living(g)+g.lost+g.rescued,total);
});

test('교체 위원의 첫 발언도 현재 현장을 근거로 한 번만 생성',async()=>{
 const g=e.newGame({demo:true,seed:'replacement'});g.council[0]={...COUNCIL.find(c=>c.id==='metric'),joinedDay:2};
 g.day=2;g.missionZone='archive';e.beginDiscussion(g);
 const ai=new GameAI({dataDir:'/unused',recordUsage:()=>{},available:()=>true}),seen=[];
 ai.withProject=async(o,g,fn)=>fn({});
 ai.request=async(p,g,id,prompt,ctx)=>{assert.ok(prompt.includes('옛 서버실'));assert.ok(ctx.incident.includes('옛 서버실'));seen.push(id);return JSON.stringify({text:'현재 현장의 근거를 확인했습니다.'});};
 await ai.opening('isolated',g);await ai.opening('isolated',g);
 assert.deepEqual(new Set(seen),new Set(g.council.map(c=>c.id)));assert.equal(seen.length,3);assert.equal(g.usage.fallbacks,0);
});

test('EVE 보호 보너스가 사망자를 구출 인원으로 되살리지 않음',()=>{
 const g=e.newGame({demo:true,seed:'rescue-cap'});g.eveProtected=true;
 e.beginDiscussion(g);e.addSpeech(g,'공식 기록에 따라 현장 작전을 검증하십시오.');e.prepareOperation(g);e.executeSearch(g,'rush');
 const lost=g.lost;e.endGame(g,'escape');assert.equal(g.rescued+lost,g.total);
 assert.ok(g.story.contacts.every(c=>['escaped','lost'].includes(c.status)));
});
