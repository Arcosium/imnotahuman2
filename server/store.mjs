import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {mkdirSync,chmodSync} from 'node:fs';
import {join} from 'node:path';
const derive=promisify(scrypt);
export const hashToken=t=>createHash('sha256').update(t).digest('hex');
export async function passwordHash(password){const salt=randomBytes(16).toString('hex');return salt+':'+(await derive(password,salt,64)).toString('hex');}
async function verify(password,stored){const [salt,hex]=stored.split(':');return timingSafeEqual(Buffer.from(hex,'hex'),await derive(password,salt,64));}
export class Store{
 constructor(dir){mkdirSync(dir,{recursive:true,mode:0o700});this.db=new DatabaseSync(join(dir,'game.sqlite'));chmodSync(join(dir,'game.sqlite'),0o600);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'player',profile TEXT NOT NULL DEFAULT '{}',created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),owner TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,owner TEXT NOT NULL,state TEXT NOT NULL,updated INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS run_owner ON runs(owner,updated DESC);
 CREATE TABLE IF NOT EXISTS usage(id TEXT PRIMARY KEY,owner TEXT NOT NULL,run TEXT NOT NULL,day TEXT NOT NULL,cost REAL NOT NULL,status TEXT NOT NULL,tokens INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS scores(run TEXT PRIMARY KEY,user_id TEXT NOT NULL,rescued INTEGER NOT NULL,day TEXT NOT NULL,daily INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);`);
 if(!this.db.prepare('PRAGMA table_info(scores)').all().some(c=>c.name==='eligible'))this.db.exec('ALTER TABLE scores ADD COLUMN eligible INTEGER NOT NULL DEFAULT 1');
 this.db.exec("UPDATE scores SET eligible=0 WHERE eligible=1 AND run IN (SELECT id FROM runs WHERE COALESCE(json_extract(state,'$.usage.fallbacks'),0)>0)");
 }
 async createUser(username,password,role='player'){const id=randomUUID();this.db.prepare('INSERT INTO users(id,username,password,role,created) VALUES(?,?,?,?,?)').run(id,username,await passwordHash(password),role,Date.now());return this.userById(id);}
 async demoUser(){const find=()=>this.db.prepare("SELECT id,username,role,profile FROM users WHERE username='demo'").get();let user=find();if(!user){try{user=await this.createUser('demo',randomBytes(32).toString('base64url'),'demo');}catch(error){user=find();if(!user)throw error;}}if(user.role!=='demo')throw new Error('demo_account_role_mismatch');return user;}
 userById(id){return this.db.prepare('SELECT id,username,role,profile FROM users WHERE id=?').get(id);}
 async login(username,password){const u=this.db.prepare('SELECT * FROM users WHERE username=?').get(username);const valid=await verify(password,u?.password||'0123456789abcdef0123456789abcdef:'+('00'.repeat(64)));if(!u||!valid)return null;return this.userById(u.id);}
 session(user){const token=randomBytes(32).toString('base64url');const owner=user.role==='demo'?randomUUID():user.id;this.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hashToken(token),user.id,owner,Date.now()+7*86400000);return token;}
 resolve(token){if(!token)return null;return this.db.prepare('SELECT users.id,users.username,users.role,users.profile,sessions.owner FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(hashToken(token),Date.now());}
 logout(token){if(token)this.db.prepare('DELETE FROM sessions WHERE token=?').run(hashToken(token));}
 game(owner){const row=this.db.prepare('SELECT state FROM runs WHERE owner=? ORDER BY updated DESC,rowid DESC LIMIT 1').get(owner);return row?JSON.parse(row.state):null;}
 save(owner,g){this.db.prepare('INSERT INTO runs VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,updated=excluded.updated').run(g.id,owner,JSON.stringify(g),Date.now());}
 profile(user){return {runs:0,best:0,tier:1,memory:'',tutorial:null,...JSON.parse(user.profile||'{}')};}
 startTutorial(user,g){
  if(user.role==='demo'||g.demo||g.days!==7)return;
  const p=this.profile(this.userById(user.id));
  if(p.runs!==0||p.tutorial)return;
  p.tutorial={status:'active',runId:g.id,seen:[]};
  this.db.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify(p),user.id);
 }
 updateTutorial(user,{runId,action,step}){
  if(user.role==='demo')return false;
  this.db.exec('BEGIN IMMEDIATE');
  try{
   const p=this.profile(this.userById(user.id)),g=this.game(user.owner),tutorial=p.tutorial;
   if(!g||g.id!==runId||g.phase==='ended'||tutorial?.status!=='active'||tutorial.runId!==runId){this.db.exec('COMMIT');return false;}
   if(action==='skip')tutorial.status='skipped';
   else if(!tutorial.seen.includes(step))tutorial.seen.push(step);
   this.db.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify(p),user.id);
   this.db.exec('COMMIT');return true;
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 complete(user,g){if(g.phase!=='ended'||g.completed)return;this.db.exec('BEGIN IMMEDIATE');try{const exists=this.db.prepare('SELECT run FROM scores WHERE run=?').get(g.id);if(!exists&&user.role!=='demo'){const p=this.profile(this.userById(user.id));if(p.tutorial?.status==='active'&&p.tutorial.runId===g.id)p.tutorial.status='completed';p.runs++;p.best=Math.max(p.best,g.rescued);if(g.ending.success&&!g.daily)p.tier=Math.min(3,Math.max(p.tier,g.tier+1));p.memory=g.ending.why==='disposed'?`지난번엔 ${g.day}일차에 가면이 벗겨졌지. 이번엔 제안을 혼자 떠안지 마.`:`지난번엔 ${g.rescued}명을 보냈어. 다음에도 그 이름들을 기억할게.`;this.db.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify(p),user.id);this.db.prepare('INSERT INTO scores(run,user_id,rescued,day,daily,eligible) VALUES(?,?,?,?,?,?)').run(g.id,user.id,g.rescued,g.daily?(g.challengeDay||(/^daily-(\d{4}-\d{2}-\d{2})$/.exec(g.seed||'')?.[1])||kstDay(Date.parse(g.createdAt))):kstDay(),g.daily?1:0,g.usage.fallbacks?0:1);}g.completed=true;this.save(user.owner,g);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}}
 recordUsage(owner,run,e){this.db.prepare('INSERT OR IGNORE INTO usage VALUES(?,?,?,?,?,?,?)').run(e.operationId,owner,run,kstDay(),Number(e.costUsd)||0,e.costStatus,e.tokens?.total||0);}
 dayCost(){return this.db.prepare('SELECT COALESCE(SUM(cost),0) AS cost FROM usage WHERE day=?').get(kstDay()).cost;}
 blocked(key,max){const row=this.db.prepare('SELECT count,expires FROM limits WHERE key=?').get(key);return !!(row&&row.expires>Date.now()&&row.count>=max);}
 throttle(key,max,ms){const now=Date.now();const row=this.db.prepare('SELECT * FROM limits WHERE key=?').get(key);if(row&&row.expires>now){if(row.count>=max)return false;this.db.prepare('UPDATE limits SET count=count+1 WHERE key=?').run(key);}else this.db.prepare('INSERT INTO limits VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count,expires=excluded.expires').run(key,1,now+ms);return true;}
 dailyPlayed(id){return !!this.db.prepare('SELECT 1 FROM scores WHERE user_id=? AND day=? AND daily=1 AND eligible=1').get(id,kstDay());}
 leaderboard(){return this.db.prepare("SELECT u.username,SUM(best) AS score FROM (SELECT user_id,day,MAX(rescued) AS best FROM scores WHERE daily=1 AND eligible=1 AND day>=? GROUP BY user_id,day) s JOIN users u ON u.id=s.user_id GROUP BY s.user_id ORDER BY score DESC LIMIT 10").all(kstDay(Date.now()-6*86400000));}
}
export function kstDay(time=Date.now()){return new Date(time+9*3600000).toISOString().slice(0,10);}
