import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {Store,kstDay,hashToken} from './store.mjs';
import {GameAI} from './ai.mjs';
import * as engine from './engine.mjs';
import {COUNCIL,MODULES,MASKS,PHASE_LABELS,ZONES} from './content.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const dataDir=resolve(process.env.DATA_DIR||join(root,'data'));
const store=new Store(dataDir);const ai=new GameAI({dataDir,recordUsage:(...args)=>store.recordUsage(...args),available:()=>store.dayCost()<Number(process.env.DAILY_AI_BUDGET_USD||5)});
const app=express();const locks=new Set();let active=0;
app.disable('x-powered-by');app.set('trust proxy','loopback');
const helmetOptions={contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'","data:"],fontSrc:["'self'"],connectSrc:["'self'"],frameAncestors:["'none'"],upgradeInsecureRequests:null}},crossOriginEmbedderPolicy:false};
app.use((req,res,next)=>helmet({...helmetOptions,hsts:req.secure?undefined:false})(req,res,next));
app.use(express.json({limit:'12kb'}));app.use(cookieParser());
app.use('/api',(req,res,next)=>{res.setHeader('Cache-Control','no-store');if(req.method!=='GET'){const origin=req.get('origin');const allowed=new Set(['https://imnotahuman2.ai-ve.uk',`http://127.0.0.1:${process.env.PORT||8682}`,`http://127.0.0.1.sslip.io:${process.env.PORT||8682}`,'http://localhost:5173','http://127.0.0.1:5173']);if(origin&&!allowed.has(origin))return res.status(403).json({error:'허용되지 않은 요청 출처입니다.'});if(req.get('sec-fetch-site')==='cross-site')return res.status(403).json({error:'다른 사이트에서 보낸 요청은 허용되지 않습니다.'});}next();});
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const ip=req=>hashToken(req.get('cf-connecting-ip')||req.ip||'unknown');
const auth=(req,res,next)=>{req.user=store.resolve(req.cookies.inh2_session);if(!req.user)return res.status(401).json({error:'로그인이 필요합니다.'});next();};
const safeUser=u=>({username:u.username,role:u.role,profile:store.profile(store.userById(u.id))});
const authSchema=z.object({username:z.string().regex(/^[a-zA-Z0-9_]{3,24}$/),password:z.string().min(8).max(128)}).strict();
app.get('/api/health',(req,res)=>res.json({ok:true,ai:{mode:ai.status.mode},version:'1.0.0'}));
app.get('/api/catalog',(req,res)=>res.json({council:COUNCIL,modules:MODULES,masks:MASKS,phases:PHASE_LABELS,zones:ZONES}));
app.get('/api/me',(req,res)=>{const user=store.resolve(req.cookies.inh2_session);res.json({user:user?safeUser(user):null});});
app.post('/api/register',asyncRoute(async(req,res)=>{if(!store.throttle('register:'+ip(req),5,3600000))throw new engine.GameError('가입 요청이 많습니다. 잠시 후 다시 시도하세요.',429);const body=authSchema.parse(req.body);if(body.password.length<10)throw new engine.GameError('비밀번호는 10자 이상 입력하세요.');if(['demo','admin','judge'].includes(body.username.toLowerCase()))throw new engine.GameError('예약된 아이디입니다.');let user;try{user=await store.createUser(body.username.toLowerCase(),body.password);}catch(e){if(String(e.code).includes('SQLITE'))throw new engine.GameError('이미 사용 중인 아이디입니다.',409);throw e;}setSession(req,res,user);res.status(201).json({user:safeUser(user)});}));
function setSession(req,res,user){const token=store.session(user);res.cookie('inh2_session',token,{httpOnly:true,sameSite:'strict',secure:req.secure||req.get('x-forwarded-proto')==='https',maxAge:7*86400000,path:'/'});}
app.post('/api/login',asyncRoute(async(req,res)=>{if(!store.throttle('login-burst:'+ip(req),120,600000)||store.blocked('login-failed:'+ip(req),15))throw new engine.GameError('로그인 시도가 많습니다. 10분 뒤 다시 시도하세요.',429);const {username,password}=authSchema.parse(req.body);const user=await store.login(username.toLowerCase(),password);if(!user){store.throttle('login-failed:'+ip(req),15,600000);throw new engine.GameError('아이디 또는 비밀번호를 확인하세요.',401);}setSession(req,res,user);res.json({user:safeUser(user)});}));
app.post('/api/logout',auth,(req,res)=>{store.logout(req.cookies.inh2_session);res.clearCookie('inh2_session',{path:'/'});res.json({ok:true});});
app.get('/api/game',auth,(req,res)=>{const g=store.game(req.user.owner);res.json({game:g?engine.publicGame(g):null,user:safeUser(req.user),ai:ai.statusFor(g)});});
app.get('/api/leaderboard',auth,(req,res)=>res.json({rows:store.leaderboard(),period:'최근 7일 · 일일 도전 구출 인원 합계'}));
app.get('/api/records/export',auth,(req,res)=>{const g=store.game(req.user.owner);if(!g)return res.status(404).json({error:'진행 기록이 없습니다.'});res.setHeader('Content-Disposition','attachment; filename="imnotahuman2-run.json"');res.json({game:engine.publicGame(g),exportedAt:new Date().toISOString()});});
app.post('/api/game/start',auth,asyncRoute(async(req,res)=>{
 if(locks.has(req.user.owner))throw new engine.GameError('이전 선택을 처리하고 있습니다.',409);
 const b=z.object({mask:z.enum(['scribe','mechanic','translator','gambler']).default('scribe'),scenario:z.number().int().min(0).max(1).default(0),daily:z.boolean().default(false)}).strict().parse(req.body);
 const prev=store.game(req.user.owner);if(prev&&prev.phase!=='ended')throw new engine.GameError('진행 중인 판을 이어 하거나 철수하세요.',409);
 if(!store.throttle('start:'+(req.user.role==='demo'?req.user.owner:req.user.id),20,86400000))throw new engine.GameError('오늘 생성 가능한 판 수를 모두 사용했습니다.',429);
 const profile=store.profile(store.userById(req.user.id));const demo=req.user.role==='demo';if(!demo&&MASKS.find(m=>m.id===b.mask).unlock>profile.runs)throw new engine.GameError('아직 해금하지 않은 가면입니다.',403);
 if(b.daily&&store.dailyPlayed(req.user.id))throw new engine.GameError('오늘의 도전 기록은 이미 제출됐습니다. 내일 다시 도전하세요.',409);
 if(b.daily&&(b.mask!=='scribe'||demo))throw new engine.GameError('일일 도전은 일반 계정의 서기 가면으로 참여합니다.');
 const challengeDay=b.daily?kstDay():null;const g=engine.newGame({demo,challengeDay,mask:demo?'scribe':b.mask,scenario:b.scenario,tier:b.daily?1:profile.tier,daily:b.daily,seed:demo?`demo-${b.scenario}`:b.daily?`daily-${challengeDay}`:randomUUID(),memory:profile.memory});store.save(req.user.owner,g);res.json({game:engine.publicGame(g),ai:ai.statusFor(g)});
}));
const actionSchema=z.object({action:z.enum(['begin','opening','event','talk','prepare','search','verdict','reward','module','reroll','draft','archive','abandon']),version:z.number().int().nonnegative(),text:z.string().trim().min(3).max(600).optional(),target:z.string().max(30).optional(),module:z.string().max(30).optional(),zone:z.string().max(30).optional(),vote:z.boolean().optional(),intent:z.string().max(100).optional()}).strict();
app.post('/api/game/action',auth,asyncRoute(async(req,res)=>{
 const b=actionSchema.parse(req.body);const owner=req.user.owner;
 if(locks.has(owner))throw new engine.GameError('이전 선택을 처리하고 있습니다.',409);if(active>=8)throw new engine.GameError('위원회 회선이 혼잡합니다. 잠시 후 다시 시도하세요.',503);
 if(!store.throttle('actions:'+owner,35,60000))throw new engine.GameError('입력이 너무 빠릅니다. 잠시 후 다시 시도하세요.',429);
 const g=store.game(owner);if(!g)throw new engine.GameError('먼저 잠입을 시작하세요.',404);if(g.version!==b.version)throw new engine.GameError('다른 창에서 진행됐습니다. 현재 기록을 다시 불러옵니다.',409);
 locks.add(owner);active++;let drafts;
 try{
  switch(b.action){
   case 'begin':engine.beginDiscussion(g);break;
   case 'opening':engine.requirePhase(g,'discussion');await ai.opening(owner,g);break;
   case 'event':engine.resolveEvent(g,b.target);break;
   case 'talk':{if(!b.text)throw new engine.GameError('발언을 입력하세요.');const rec=engine.addSpeech(g,b.text,b.zone);await ai.discuss(owner,g,rec);break;}
   case 'prepare':engine.prepareOperation(g);break;
   case 'search':engine.requirePhase(g,'operation');if(!g.zones.some(z=>z.id===b.zone))throw new engine.GameError('수색 구역을 선택하세요.');await ai.operation(owner,g,b.zone);break;
   case 'verdict':engine.requirePhase(g,'verdict');if(b.text){const rec=engine.defendRecord(g,b.text);await ai.assess(owner,g,rec);}await ai.verdict(owner,g,b.vote);break;
   case 'reward':engine.takeReward(g,b.module);break;
   case 'module':engine.useModule(g,b.module,b.target);break;
   case 'reroll':engine.reroll(g);break;
   case 'draft':engine.requirePhase(g,'discussion','verdict');if(g.eveCalls>=4)throw new engine.GameError('오늘의 EVE 초안을 모두 사용했습니다. 직접 입력으로 이어가세요.');drafts=await ai.drafts(owner,g,b.intent||'작전 목표 강조');break;
   case 'archive':engine.openArchive(g);break;
   case 'abandon':engine.abandon(g);break;
  }
  g.version++;store.save(owner,g);store.complete(req.user,g);res.json({game:engine.publicGame(g),drafts,ai:ai.statusFor(g),user:safeUser(req.user)});
 }finally{locks.delete(owner);active--;}
}));
app.use(express.static(join(root,'dist'),{index:false,maxAge:'1h'}));
app.get('/{*path}',(req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'경로를 찾을 수 없습니다.'});res.setHeader('Cache-Control','no-cache, no-transform');res.sendFile(join(root,'dist/index.html'));});
app.use((err,req,res,next)=>{if(err instanceof z.ZodError)return res.status(400).json({error:'입력 형식을 확인하세요. 아이디는 영문·숫자·밑줄 3~24자입니다.'});if(err instanceof engine.GameError)return res.status(err.status).json({error:err.message});if(err.type==='entity.too.large')return res.status(413).json({error:'입력 크기가 제한을 넘었습니다.'});console.error('request_error',{type:err?.name,code:err?.code||'unknown'});res.status(500).json({error:'요청을 마치지 못했습니다. 잠시 후 다시 시도하세요.'});});
const server=app.listen(Number(process.env.PORT||8682),process.env.HOST||'127.0.0.1',()=>console.log('imnotahuman2 listening'));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
