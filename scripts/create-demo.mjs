import {Store} from '../server/store.mjs';
import {randomBytes} from 'node:crypto';
import {writeFileSync,existsSync} from 'node:fs';
const store=new Store('data');const existing=store.db.prepare('SELECT id FROM users WHERE username=?').get('demo');
if(existing){console.log('Demo account already exists; preserved.');process.exit(0);}
const password=randomBytes(12).toString('base64url');await store.createUser('demo',password,'demo');
const path='data/demo-access.txt';if(existsSync(path))throw new Error('Refusing to replace existing access notes');
writeFileSync(path,`The Last Vote 시연 계정\n사이트: https://thelastvote.ai-ve.uk\n아이디: demo\n비밀번호: ${password}\n\n이 계정으로 로그인하면 3일 시연판이 열립니다. 로그인 세션마다 진행이 분리됩니다.\n`,{mode:0o600});console.log('Demo created. Private access details: data/demo-access.txt');
