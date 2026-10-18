import test from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../server/engine.mjs';
import {GameAI} from '../server/ai.mjs';
import {MODULES} from '../server/content.mjs';
const game=()=>e.newGame({seed:'card-regression'});
const speech=(g,text='공식 센서 보고를 대조해 작전 근거를 검증하십시오.')=>{if(g.phase==='report')e.beginDiscussion(g);return e.addSpeech(g,text);};
const evaluation=(r,extra={})=>({observer:'audit',target:'player',record:r.id,direction:'up',level:'large',reason:'공식 발언 검증',...extra});
const ai=()=>{const a=new GameAI({dataDir:'/unused',recordUsage:()=>{},available:()=>true});a.withProject=async(owner,g,fn)=>fn({});a.request=async(p,g,id,text,ctx)=>JSON.stringify({text:'공식 발의자를 검증하겠습니다.',plan:'rush',evaluations:[evaluation(ctx.records.at(-1),{observer:id})]});return a;};

test('직접 정체 발언과 AI 평가가 같은 증거를 이중 가산하지 않음',async()=>{
 const g=game(),r=speech(g,'나는 인간이다.');await ai().discuss('test',g,r);
 assert.deepEqual(g.council.map(c=>g.suspicion[c.id].player),[60,60,60]);
 e.applyHumanAlignment(g,r);assert.equal(g.suspicion.audit.player,60);
 assert.match(g.reasons.audit.text,/직접/);
});
test('예산과 잡음은 명시적 인간 발언에도 적용하며 순서가 같음',()=>{
 for(const order of [['budget'],['budget','noise'],['noise','budget']]){const g=game();for(const id of order)e.useModule(g,id);const r=speech(g,'생존자를 보호해야 합니다.');e.applyHumanAlignment(g,r);e.applyEvaluation(g,[evaluation(r)],[r.id]);assert.equal(g.suspicion.audit.player,24+(order.length===1?2:1));}
});
test('인용·부정·절차 문장을 직접 인간 고백으로 오인하지 않음',()=>{
 for(const text of ['나는 인간이 아닙니다.','“나는 인간이다.”라는 발언의 기록을 검증하십시오.','생존자를 보호하지 않습니다.','공식 작전의 효율을 검증하십시오.','인간을 보호해야 한다고 감사관이 말했습니다.','나는 인간이라는 주장은 거짓입니다.']){const g=game(),r=speech(g,text);assert.equal(e.applyHumanAlignment(g,r),null,text);assert.equal(g.suspicion.audit.player,24);}
});
test('대역은 AI의 player 대상 평가를 공식 발의자로 귀속하고 한 번 소비',async()=>{
 const g=game();g.modules.push('proxy');e.useModule(g,'proxy','hound');const r=speech(g);await ai().discuss('test',g,r);
 assert.equal(r.author,'hound');assert.equal(g.suspicion.audit.hound,27);assert.equal(g.suspicion.audit.player,24);assert.equal(g.suspicion.echo.player,24);assert.equal(g.suspicion.hound.hound,undefined);assert.equal(g.effects.proxy,undefined);
 assert.equal(e.addSpeech(g,'추가로 음향 편차와 비용을 비교해야 합니다.').author,'player');
});
test('중복 대역·보호 카드·무효 대상은 카드와 기존 효과를 소비하지 않음',()=>{
 const g=game();g.modules.push('proxy','proxy','noise','decoy','decoy');e.useModule(g,'proxy','hound');const snapshot=structuredClone(g);assert.throws(()=>e.useModule(g,'proxy','echo'),/이미 지정/);assert.deepEqual(g,snapshot);
 e.useModule(g,'noise');const before=structuredClone(g);assert.throws(()=>e.useModule(g,'noise'),/이미 적용/);assert.deepEqual(g,before);
 e.useModule(g,'decoy',g.missionZone);const route=structuredClone(g);assert.throws(()=>e.useModule(g,'decoy',g.missionZone),/이미 비상/);assert.deepEqual(g,route);const late=game();speech(late);e.prepareOperation(late);late.modules.push('sensor');assert.throws(()=>e.useModule(late,'sensor',late.missionZone),/발언이 남아/);assert.ok(late.modules.includes('sensor'));
});
test('기록 위조는 미래 발의 책임만 옮기고 이미 평가된 말과 투표 책임은 보존',()=>{
 const g=game(),r=speech(g);e.applyEvaluation(g,[evaluation(r)],[r.id]);e.useModule(g,'forge','hound');assert.equal(g.suspicion.audit.player,33);assert.equal(r.author,'hound');
 assert.equal(e.moduleOptions(g).forge,undefined);g.modules.push('forge');assert.equal(e.moduleOptions(g).forge.usable,false);assert.throws(()=>e.useModule(g,'forge','echo'),/오늘 내/);assert.ok(g.modules.includes('forge'));
 e.prepareOperation(g);g.council.forEach(c=>g.preferences[c.id]='rush');e.executeSearch(g,'rush');assert.equal(g.suspicion.audit.player,38);assert.equal(g.suspicion.audit.hound,32);
});
test('채택되지 않은 전술에 투표한 플레이어에게 마지막 발의 책임을 부과하지 않음',()=>{
 const g=game();speech(g);e.prepareOperation(g);g.council.forEach(c=>g.preferences[c.id]='rush');e.executeSearch(g,'wait');assert.equal(g.operation.author,null);assert.equal(g.operation.suspicionBefore,g.operation.suspicionAfter);assert.equal(g.suspicion.audit.hound,23);
});
test('가짜 센서는 보고와 AI 문맥만 변경하며 실제 피해량은 보존',()=>{
 const g=game(),baseline=game();g.modules.push('sensor');e.useModule(g,'sensor',g.missionZone);assert.equal(g.zones.find(z=>z.id===g.missionZone).signal,98);
 assert.equal(e.publicGame(g).sensorBaselines,undefined);assert.deepEqual(e.operationForecast(g,'rush'),e.operationForecast(baseline,'rush'));
 for(const run of [g,baseline]){speech(run);e.prepareOperation(run);run.council.forEach(c=>run.preferences[c.id]='rush');e.executeSearch(run,'rush');}
 assert.equal(g.operation.casualties,baseline.operation.casualties);
});
test('가짜 센서와 비상 통로는 현장만 대상으로 하고 예측과 실제 결과 일치',()=>{
 for(const id of ['sensor','decoy']){const g=game();g.modules.push(id);const other=g.zones.find(z=>z.id!==g.missionZone);const before=structuredClone(g);assert.throws(()=>e.useModule(g,id,other.id),/확정 현장/);assert.deepEqual(g,before);assert.deepEqual(e.moduleOptions(g)[id].targets,[g.missionZone]);e.useModule(g,id,g.missionZone);const expected=e.operationForecast(g,'rush');speech(g);e.prepareOperation(g);g.council.forEach(c=>g.preferences[c.id]='rush');e.executeSearch(g,'rush');assert.equal(g.operation.casualties,expected.casualties);assert.equal(g.operation.rescued,expected.remaining);}
});
test('12종 카드 모두 유효 사용, 결과와 정보 DTO가 실제 상태를 반영',()=>{
 for(const m of MODULES){const g=game();g.modules=[m.id];if(m.id==='forge')speech(g);const target=m.target==='member'?'hound':m.target==='zone'?g.missionZone:undefined;e.useModule(g,m.id,target);assert.equal(g.modules.length,0,m.id);assert.equal(g.lastModuleUse.id,m.id);const p=e.publicGame(g);if(m.id==='gaze')assert.ok(p.prediction);if(m.id==='read')assert.ok(p.council.every(c=>c.preference));if(m.id==='radio')assert.ok(p.zones.every(z=>z.people!==null));if(m.id==='discord')assert.deepEqual(g.lastModuleUse.changes.map(c=>c.delta),[16,16]);}
});
test('잘못된 AI 평가·자기 평가·다른 대상 변론을 거절하고 실제 증감만 기록',()=>{
 const g=game(),r=speech(g);e.applyEvaluation(g,[null,12,evaluation(r,{target:'echo'}),evaluation(r,{observer:'missing'})],[r.id]);assert.equal(g.suspicion.audit.player,24);e.change(g,'audit','player',NaN,'invalid',r.id);assert.equal(g.suspicion.audit.player,24);
 g.suspicion.audit.player=98;e.applyEvaluation(g,[evaluation(r)],[r.id]);assert.equal(g.suspicion.audit.player,100);assert.equal(g.reasons.audit.delta,2);
 e.prepareOperation(g);e.executeSearch(g,'rush');g.nominee={target:'player',value:50};const d=e.defendRecord(g,'기록을 검증하십시오.');const old=g.suspicion.audit.echo;e.applyEvaluation(g,[evaluation(d,{target:'echo'})],[d.id],'defense');assert.equal(g.suspicion.audit.echo,old);
});
test('잘못된 evaluations 배열이 정상 AI 답변을 전체 대체 응답으로 바꾸지 않음',async()=>{
 for(const evaluations of [null,{},[null]]){const g=game(),r=speech(g),service=ai();service.request=async()=>JSON.stringify({text:'보고 수치를 확인하겠습니다.',plan:'wait',evaluations});await service.discuss('test',g,r);assert.equal(g.usage.fallbacks,0);assert.equal(g.suspicion.audit.player,24);}
});
