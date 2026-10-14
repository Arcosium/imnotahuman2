import {Croche} from '@h1r-ai/croche';
import {FileStorage} from '@h1r-ai/croche/node';
import {randomUUID} from 'node:crypto';
const calls=[];const usage=[];
const app=await Croche.open({projectKey:process.env.CROCHE_PROJECT_KEY,serverKey:process.env.CROCHE_SERVER_KEY,user:'imnotahuman2-connection-check',language:'ko',storage:new FileStorage('data/croche-smoke'),requestTimeoutMs:25000,
 config:{model:'deepseek/deepseek-v4.1-flash',instructions:'한국어로 답하세요. 연결 검사를 요청받으면 반드시 records 도구의 lookup 명령으로 R001을 조회한 뒤 그 기록의 문장을 짧게 답하세요.',maxOutputTokens:300,maxIterations:3,tools:[{name:'records',summary:'심의 기록 조회',commands:[{name:'lookup',key:'records.lookup',summary:'번호로 실제 기록 조회',reads:true,flags:[{name:'id',type:'string',required:true}]}]}]},
 handlers:{records:inv=>{calls.push(inv.key);return {id:'R001',text:'첫날 소집. 비정상 회선 1건.'};}},onUsage:e=>usage.push({model:e.model,costUsd:e.costUsd,costStatus:e.costStatus,tokens:e.tokens})});
try{const agent=await app.agent();const events=[];const subscription=agent.subscribe({onEvent:e=>{if(e.type==='message.end')events.push(e.type);}});const result=await agent.request({id:randomUUID(),text:'R001 기록을 조회해서 연결 검사를 완료하세요.'},{wait:'idle',signal:AbortSignal.timeout(45000)});subscription.close();console.log(JSON.stringify({status:result.status,messages:result.messages.map(m=>({text:m.text,status:m.status,error:m.error?.code})),toolCalls:calls,usage,streamMessages:events.length}));if(!calls.length||!result.messages.some(m=>m.text))process.exitCode=1;}finally{await app.close();}
