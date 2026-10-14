import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createServer,request as httpRequest} from 'node:http';
const base=process.env.QA_URL||'http://127.0.0.1:8682';
const pass=readFileSync('data/demo-access.txt','utf8').match(/비밀번호: (.+)/)[1];
const out=process.env.QA_OUT||'_workspace/browser-qa';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.QA_CHROMIUM||'/home/arcosium/.cache/ms-playwright/chromium-1217/chrome-linux/chrome'});
const ctx=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}});
const page=await ctx.newPage();
async function capture(options){await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot(options);}
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base);await page.getByLabel('아이디',{exact:true}).fill('demo');await page.getByLabel('비밀번호',{exact:true}).fill(pass);await page.getByRole('button',{name:'접속하기',exact:true}).click();await page.getByRole('button',{name:'위원회 잠입 시작'}).waitFor();
await capture({path:out+'/lobby-desktop.png',fullPage:true});
await page.getByRole('button',{name:'위원회 잠입 시작'}).click();await page.getByRole('button',{name:'보고 확인 · 토론 입장'}).waitFor();await capture({path:out+'/report-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await capture({path:out+'/report-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:900});
const cookies=await ctx.cookies();const cookie=cookies.map(c=>`${c.name}=${c.value}`).join('; ');
// Loopback-only authenticated QA proxy. Cookie stays in memory and is never printed or written.
const proxy=createServer((req,res)=>{const target=new URL(req.url,base);const upstream=httpRequest(target,{method:'GET',headers:{cookie}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});upstream.on('error',()=>{res.writeHead(502);res.end();});upstream.end();});
await new Promise(r=>proxy.listen(18683,'127.0.0.1',r));
console.log('QA proxy ready at http://127.0.0.1:18683; report screen');
await page.getByRole('button',{name:'보고 확인 · 토론 입장'}).click();await page.getByRole('button',{name:'빈 구역으로 유도',exact:true}).waitFor();await page.getByRole('button',{name:'빈 구역으로 유도',exact:true}).click();await page.locator('.drafts button').first().waitFor({timeout:60000});await page.locator('.drafts button').first().click();await page.getByRole('button',{name:'발언 제출',exact:true}).click();await page.locator('.processing').waitFor({state:'hidden',timeout:120000});await capture({path:out+'/discussion-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await capture({path:out+'/discussion-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:900});
let r=await ctx.request.get(base+'/api/game');let state=(await r.json()).game;writeFileSync(out+'/live-turn.json',JSON.stringify({day:state.day,phase:state.phase,councilReplies:state.messages.filter(m=>m.source==='croche').length,usage:state.usage},null,2));
console.log('Live discussion complete',JSON.stringify({replies:state.messages.filter(m=>m.source==='croche').length,usage:state.usage}));
// Keep a stable discussion screen for the independent design checker until a local file asks to continue.
console.log('Awaiting _workspace/continue-qa to finish the 3-day run');
const fs=await import('node:fs');while(!fs.existsSync('_workspace/continue-qa'))await new Promise(r=>setTimeout(r,1000));
for(let day=1;day<=3;day++){
 r=await ctx.request.get(base+'/api/game');state=(await r.json()).game;if(state.phase==='ended')break;
 if(state.phase==='report'){await page.getByRole('button',{name:'보고 확인 · 토론 입장'}).click();await page.locator('#speech').fill(`${day}일차 센서 신호를 검증하기 위해 해당 구역의 공동 수색을 제안합니다. 기록을 대조하십시오.`);await page.getByRole('button',{name:'발언 제출',exact:true}).click();await page.locator('.processing').waitFor({state:'hidden',timeout:120000});}
 await page.getByRole('button',{name:'토론 종료 · 작전 결정'}).click();await page.getByRole('button',{name:/에 투표$/}).click();await page.getByRole('button',{name:'최종 심의 진행'}).waitFor({timeout:90000});await capture({path:out+`/verdict-day${day}.png`,fullPage:true});await page.locator('#defense').fill('공동 검증으로 승인된 수색입니다. 발의 기록과 표를 함께 대조해 주십시오.');await page.getByRole('button',{name:'최종 심의 진행'}).click();await page.locator('.processing').waitFor({state:'hidden',timeout:120000});
 r=await ctx.request.get(base+'/api/game');state=(await r.json()).game;if(state.phase==='ended')break;await capture({path:out+`/reward-day${day}.png`,fullPage:true});await page.locator('.reward-item').first().click();await page.getByRole('button',{name:'보고 확인 · 토론 입장'}).waitFor();
}
await capture({path:out+'/ending-desktop.png',fullPage:true});r=await ctx.request.get(base+'/api/game');state=(await r.json()).game;writeFileSync(out+'/live-run.json',JSON.stringify({phase:state.phase,day:state.day,ending:state.ending,usage:state.usage,tools:state.toolReceipts,errors},null,2));console.log('QA result',JSON.stringify({phase:state.phase,day:state.day,usage:state.usage,tools:state.toolReceipts,errors}));
await ctx.close();await browser.close();proxy.close();if(errors.length||state.phase!=='ended')process.exitCode=1;
