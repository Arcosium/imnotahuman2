import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {createServer} from 'node:net';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';

async function unusedPort(){const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}

test('첫 7일 플레이 안내의 계정별 영속성과 게임 상태 분리',{timeout:40000},async t=>{
 const base=process.env.TEST_PRIVATE_DIR||join(homedir(),'vault/imnotahuman2/tests');mkdirSync(base,{recursive:true,mode:0o700});
 const dir=mkdtempSync(join(base,'tutorial-')),port=await unusedPort(),origin=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['server/index.mjs'],{cwd:process.cwd(),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DATA_DIR:dir,AI_OFFLINE:'1'},stdio:'pipe'});
 let ready='';child.stdout.on('data',chunk=>ready+=chunk);child.stderr.on('data',()=>{});
 const request=async(path,{body,cookie=''}={})=>{
  const response=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',cookie,Origin:origin},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,body:await response.json(),cookie:response.headers.getSetCookie().find(v=>!v.includes('Expires=Thu, 01 Jan 1970'))?.split(';')[0]};
 };
 const password=randomBytes(20).toString('hex');let inspector,first,run,second;
 try{
  for(let i=0;i<100&&!ready.includes('listening');i++)await new Promise(resolve=>setTimeout(resolve,50));assert.match(ready,/The Last Vote listening/);
  inspector=new Store(dir);

  await t.test('신규 일반 계정의 첫 판에서만 안내를 시작하고 새로고침·재로그인으로 복구',async()=>{
   first=await request('/api/register',{body:{username:'tutorial_first',password}});assert.equal(first.status,201);assert.equal(first.body.user.profile.tutorial,null);
   const start=await request('/api/game/start',{body:{},cookie:first.cookie});assert.equal(start.status,200);run=start.body.game;
   assert.equal(run.days,7);assert.deepEqual(start.body.user.profile.tutorial,{status:'active',runId:run.id,seen:[]});
   const refresh=await request('/api/game',{cookie:first.cookie});assert.deepEqual(refresh.body.user.profile.tutorial,start.body.user.profile.tutorial);
   second=await request('/api/login',{body:{username:'tutorial_first',password}});assert.equal(second.status,200);assert.notEqual(second.cookie,first.cookie);
   assert.deepEqual(second.body.user.profile.tutorial,start.body.user.profile.tutorial);
  });

  await t.test('여러 탭의 확인 기록을 합치고 중복·게임 변경·비용 발생을 방지',async()=>{
   const user=inspector.resolve(first.cookie.split('=')[1]);
   const profile=inspector.profile(user);profile.futurePreference={volume:0.3};inspector.db.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify(profile),user.id);
   const before=inspector.game(user.owner),usageBefore=inspector.db.prepare('SELECT COUNT(*) AS count FROM usage').get().count;
   const results=await Promise.all([
    request('/api/tutorial',{body:{runId:run.id,action:'seen',step:'briefing'},cookie:first.cookie}),
    request('/api/tutorial',{body:{runId:run.id,action:'seen',step:'discussion'},cookie:second.cookie}),
    request('/api/tutorial',{body:{runId:run.id,action:'seen',step:'briefing'},cookie:second.cookie}),
   ]);
   for(const response of results)assert.equal(response.status,200);
   const me=await request('/api/me',{cookie:first.cookie});assert.deepEqual(me.body.user.profile.tutorial.seen.sort(),['briefing','discussion']);
   assert.deepEqual(me.body.user.profile.futurePreference,{volume:0.3});
   assert.deepEqual(inspector.game(user.owner),before);assert.equal(inspector.db.prepare('SELECT COUNT(*) AS count FROM usage').get().count,usageBefore);
   assert.deepEqual(before.usage,run.usage);assert.equal(before.version,run.version);
  });

  await t.test('인증·현재 판 소유권·입력 형식을 확인',async()=>{
   const body={runId:run.id,action:'seen',step:'operation'};
   assert.equal((await request('/api/tutorial',{body})).status,401);
   const outsider=await request('/api/register',{body:{username:'tutorial_other',password}});assert.equal(outsider.status,201);
   const otherRun=await request('/api/game/start',{body:{},cookie:outsider.cookie});assert.equal(otherRun.status,200);
   assert.equal((await request('/api/tutorial',{body,cookie:outsider.cookie})).status,409);
   assert.equal((await request('/api/tutorial',{body:{...body,runId:otherRun.body.game.id},cookie:first.cookie})).status,409);
   assert.equal((await request('/api/tutorial',{body:{...body,runId:randomUUID()},cookie:first.cookie})).status,409);
   for(const invalid of [{runId:run.id,action:'seen'},{...body,step:'unlisted'},{...body,action:'complete'},{...body,runId:3},{...body,version:0}]){
    assert.equal((await request('/api/tutorial',{body:invalid,cookie:first.cookie})).status,400);
   }
   assert.deepEqual((await request('/api/me',{cookie:first.cookie})).body.user.profile.tutorial.seen.sort(),['briefing','discussion']);
  });

  await t.test('건너뛰기를 저장하고 재로그인·판 완료·다음 판에서도 유지',async()=>{
   const user=inspector.resolve(first.cookie.split('=')[1]),before=inspector.game(user.owner);
   const skip=await request('/api/tutorial',{body:{runId:run.id,action:'skip'},cookie:second.cookie});assert.equal(skip.status,200);assert.equal(skip.body.user.profile.tutorial.status,'skipped');
   assert.deepEqual(inspector.game(user.owner),before);
   const relogin=await request('/api/login',{body:{username:'tutorial_first',password}});assert.equal(relogin.body.user.profile.tutorial.status,'skipped');
   assert.equal((await request('/api/tutorial',{body:{runId:run.id,action:'seen',step:'response'},cookie:first.cookie})).status,409);
   const end=await request('/api/game/action',{body:{action:'abandon',version:run.version},cookie:first.cookie});assert.equal(end.status,200);assert.equal(end.body.user.profile.runs,1);assert.equal(end.body.user.profile.tutorial.status,'skipped');
   assert.deepEqual(end.body.user.profile.futurePreference,{volume:0.3});
   const next=await request('/api/game/start',{body:{},cookie:first.cookie});assert.equal(next.status,200);assert.notEqual(next.body.game.id,run.id);assert.equal(next.body.user.profile.tutorial.status,'skipped');assert.equal(next.body.user.profile.tutorial.runId,run.id);
   assert.equal((await request('/api/tutorial',{body:{runId:next.body.game.id,action:'seen',step:'briefing'},cookie:first.cookie})).status,409);
  });

  await t.test('건너뛰지 않은 첫 판 완료는 completed가 되고 두 번째 판에서 재시작하지 않음',async()=>{
   const player=await request('/api/register',{body:{username:'tutorial_finish',password}});assert.equal(player.status,201);
   const start=await request('/api/game/start',{body:{},cookie:player.cookie}),g=start.body.game;
   assert.equal(start.body.user.profile.tutorial.status,'active');
   await request('/api/tutorial',{body:{runId:g.id,action:'seen',step:'briefing'},cookie:player.cookie});
   const end=await request('/api/game/action',{body:{action:'abandon',version:g.version},cookie:player.cookie});assert.equal(end.status,200);
   assert.deepEqual(end.body.user.profile.tutorial,{status:'completed',runId:g.id,seen:['briefing']});
   assert.equal((await request('/api/tutorial',{body:{runId:g.id,action:'skip'},cookie:player.cookie})).status,409);
   const next=await request('/api/game/start',{body:{},cookie:player.cookie});assert.equal(next.status,200);assert.deepEqual(next.body.user.profile.tutorial,end.body.user.profile.tutorial);
  });

  await t.test('기존 완료 기록이 있는 일반 계정은 안내를 자동 시작하지 않음',async()=>{
   const user=await inspector.createUser('tutorial_existing',password);inspector.db.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify({runs:3,best:45,tier:2,memory:'기존 기록',futureSetting:'preserved'}),user.id);
   const login=await request('/api/login',{body:{username:'tutorial_existing',password}});
   const start=await request('/api/game/start',{body:{},cookie:login.cookie});assert.equal(start.status,200);assert.equal(start.body.game.days,7);assert.equal(start.body.user.profile.tutorial,null);assert.equal(start.body.user.profile.futureSetting,'preserved');
   assert.equal((await request('/api/tutorial',{body:{runId:start.body.game.id,action:'seen',step:'briefing'},cookie:login.cookie})).status,409);
  });

  await t.test('3일 시연 계정은 안내를 생성하거나 저장하지 않음',async()=>{
   const demo=await request('/api/demo/login',{body:{}});assert.equal(demo.status,200);
   const start=await request('/api/game/start',{body:{},cookie:demo.cookie});assert.equal(start.status,200);assert.equal(start.body.game.days,3);assert.equal(start.body.user.profile.tutorial,null);
   assert.equal((await request('/api/tutorial',{body:{runId:start.body.game.id,action:'skip'},cookie:demo.cookie})).status,403);
   assert.equal((await request('/api/me',{cookie:demo.cookie})).body.user.profile.tutorial,null);
  });
 }finally{
  inspector?.db.close();
  if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill('SIGTERM');await exited;}
  rmSync(dir,{recursive:true,force:true});
 }
});
