import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,Cpu,Radio} from '@phosphor-icons/react';

export function DiscussionPanel({game,catalog,zone,setZone,speech,setSpeech,setDrafts,busy,action,setModal,statusText,tutorialSkip,avatar,memberName,renderEve,receipt}:any){
 const log=useRef<HTMLDivElement>(null);
 const [eveOpen,setEveOpen]=useState(false);
 function chooseDraft(text:string){setSpeech(text);setDrafts(null);setEveOpen(false);requestAnimationFrame(()=>document.getElementById('speech')?.focus());}
 useEffect(()=>{
  const container=log.current;
  if(!container||!game.lastFeedback)return;
  const last=[...container.querySelectorAll<HTMLElement>('[data-author="player"]')].at(-1);
  if(last)container.scrollTo({top:container.scrollTop+last.getBoundingClientRect().top-container.getBoundingClientRect().top-20,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 },[game.lastFeedback?.record]);
 return <div className="discussion-tablet">
  <header className="council-chat-heading">
   <div><span className="mono">DAY {String(game.day).padStart(2,'0')} / {String(game.days).padStart(2,'0')}</span><h1>소거 위원회</h1><p>수색을 돌릴 구역을 고르고, 위원들을 설득하세요.</p></div>
   <span className="chat-turns">오늘의 발언 <b>{game.turns} / 2</b></span>
  </header>
  <nav className="chat-tools" aria-label="회의 도구">
   <button onClick={()=>setModal('council')}>위원 판단</button><button onClick={()=>setModal('records')}>기록 인용</button><button onClick={()=>setModal('conversation')}>전체 대화</button><button onClick={()=>setModal('guide')}>게임 방법</button>
   {game.modules.length>0&&<button onClick={()=>setModal('inventory')} aria-label="위장 모듈 사용"><Cpu size={16}/>모듈 {game.modules.length}</button>}
   {tutorialSkip}<button className="chat-connection" onClick={()=>setModal('connection')}>{statusText}</button>
  </nav>
  {receipt}
  <div className="discussion-workspace">
   <section className="chat-reading" aria-label="대화 읽기">
    <div className="chat-panel-heading"><h2>위원회 대화</h2><span>오늘의 기록</span></div>
    <div className="conversation council-chat-log" ref={log} role="log" tabIndex={0} aria-label="위원회 대화" aria-live="polite" aria-relevant="additions">
     {game.messages.filter((m:any)=>m.day===game.day).map((m:any)=><div key={m.id} data-author={m.author} className={'message '+(m.author==='player'?'mine':m.author==='system'?'system-message':'')}>
      {m.author==='player'?<span className="sigil">나</span>:m.author==='system'?<span className="sigil">무</span>:m.author==='eve'?<span className="sigil">E</span>:avatar(catalog?.council.find((c:any)=>c.id===m.author))}
      <div><div className="message-label"><b>{m.author==='player'?'나':m.author==='system'?'무결':m.author==='eve'?'EVE':memberName(m.author)}</b></div><p>{m.text}</p></div>
     </div>)}
     {game.turns===0&&<p className="chat-silence">당신의 첫 발언을 기다리고 있습니다.<br/>수색할 구역과 설득할 근거를 정해 보세요.</p>}
    </div>
    {game.lastFeedback&&<div className="choice-feedback chat-feedback" role="status"><b>회의 반응 · {game.lastFeedback.record}</b><span>의심 {game.lastFeedback.suspicionBefore} → {game.lastFeedback.suspicionAfter} · 입장을 바꾼 위원 {game.lastFeedback.changedPreferences}명</span></div>}
   </section>
   <section className="chat-writing" aria-label="발언 작성">
    <div className="chat-panel-heading"><h2>당신의 발언</h2><span>{Math.max(0,2-game.turns)}회 남음</span></div>
    <div className="composer chat-composer">
     <div className="chat-zone-choice"><label htmlFor="proposal-zone">수색 유도 대상</label><select id="proposal-zone" disabled={busy||game.turns>=2} value={zone} onChange={e=>{setZone(e.target.value);setDrafts(null);}}>{game.zones.map((z:any)=><option key={z.id} value={z.id}>{z.name} · 신호 {z.signal}</option>)}</select></div>
     {game.turns<2&&<details className="chat-eve" open={eveOpen} onToggle={e=>setEveOpen(e.currentTarget.open)}><summary><Radio size={17}/><span>{game.eve?'EVE · 초안 도움받기':'대체 발언 선택'}</span><small>{game.eve?`${Math.max(0,4-game.eveCalls)}회`:'회선 종료'}</small></summary>{eveOpen&&renderEve(chooseDraft)}</details>}
     {game.turns<2?<><label className="chat-input-label" htmlFor="speech">위원회에 보낼 발언</label><textarea id="speech" disabled={busy} value={speech} onChange={e=>setSpeech(e.target.value)} maxLength={600} placeholder="공개 센서와 기록을 근거로 설득해 보세요. EVE 초안을 골라 고칠 수도 있습니다." rows={4}/></>:<p className="chat-turns-complete">오늘의 발언을 모두 사용했습니다.<br/>위원의 반응을 확인하고 작전으로 이동하세요.</p>}
    </div>
    {game.turns<2&&<div className="compose-bottom"><span>{speech.length} / 600자</span><button className="button primary" disabled={busy||speech.trim().length<3} onClick={()=>action('talk',{text:speech,zone})}>전송<ArrowRight size={18}/></button></div>}
    <div className="console-footer chat-footer"><button className="button secondary" disabled={busy||game.turns===0&&!game.effects.silence} onClick={()=>action('prepare')}>{game.turns===0&&!game.effects.silence?'첫 발언 후 작전 결정':'토론 종료 · 작전 결정'}<ArrowRight size={18}/></button></div>
   </section>
  </div>
 </div>;
}
