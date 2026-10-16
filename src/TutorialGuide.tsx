import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,Radio} from '@phosphor-icons/react';

export function nextTutorialStep(game:any,tutorial:any){
 if(!game||game.days!==7||tutorial?.status!=='active'||tutorial.runId!==game.id)return null;
 const seen=new Set(tutorial.seen||[]);
 const steps=game.phase==='report'?['briefing',...(!game.eventResolved?['event']:[]),...(game.modules.length?['modules']:[])]:game.phase==='discussion'?[game.turns===0?'discussion':'response']:[game.phase];
 return steps.find(step=>!seen.has(step))||null;
}
function lesson(step:string,game:any){
 const lessons:any={
  briefing:{title:'먼저, 사람을 숨길 곳을 찾으세요',target:'.location-start',lines:['당신은 AI 위원회에 숨어든 인간입니다. 7일 동안 폐기되지 않고 생존자의 40% 이상을 구출해야 합니다.','EVE의 비공개 무전과 불씨의 기록을 읽으세요. 확인된 빈 구역으로 수색을 돌리면 사람을 지킬 수 있습니다.','생존자 위치를 공개 발언에 그대로 쓰면 정체를 의심받습니다. 센서 수치를 살펴본 뒤 「토론 입장」을 누르세요.']},
  discussion:{title:'구역을 고르고, 첫 발언을 보내세요',target:'#proposal-zone',lines:['「수색 유도 대상」에서 원하는 구역을 고르세요. 「EVE · 초안 도움받기」를 열어 초안을 요청하거나 직접 발언을 쓰세요.','초안을 골라도 바로 전송되지는 않습니다. 입력란에서 내용을 확인하고 「전송」을 누르세요. 하루에 두 번 발언할 수 있습니다.','같은 주장도 AI 위원들은 다르게 받아들입니다. 답변과 의심의 변화를 읽으며 설득해 보세요.']},
  response:{title:'답변을 읽고, 다음 수를 정하세요',target:game.turns<2?'#speech':'.chat-footer button',lines:['대화 아래 「회의 반응」에서 의심과 수색 입장이 얼마나 바뀌었는지 확인하세요. 「위원 판단」에서는 각자의 이유를 볼 수 있습니다.',game.turns<2?'한 번 더 설득할 수 있습니다. 「기록 인용」으로 근거를 가져오거나 다른 논리를 써 보세요.':'오늘의 발언을 모두 사용했습니다. 위원들의 마지막 반응을 읽어 보세요.','준비가 됐다면 「토론 종료 · 작전 결정」을 누르세요. EVE의 조언도 설득의 성공을 보장하지 않습니다.']},
  operation:{title:'이제, 실제 수색에 투표합니다',target:'.zone-options button',lines:['지도의 구역과 공개 센서를 확인한 뒤 수색할 구역을 선택하세요. 아래 「구역에 투표」 버튼으로 표를 제출합니다.','당신을 포함해 가장 많은 표를 받은 구역을 수색합니다. 동률이면 탐지 신호가 높은 구역을 택하므로, 선택한 구역이 반드시 수색되는 것은 아닙니다.','빈 구역을 수색하면 사람을 지키지만 발의자와 지지자는 의심을 받습니다. 실행된 수색은 되돌릴 수 없습니다.']},
  verdict:{title:game.nominee?.target==='player'?'당신이 지목됐습니다. 기록으로 변론하세요':'지목된 위원의 책임을 판단하세요',target:game.nominee?.target==='player'?'#defense':'.vote-choices button',lines:['평균 의심은 심의 대상을 정하고, 각 위원의 의심은 폐기 찬반에 영향을 줍니다. 수색 결과와 발의 기록을 대조하세요.',game.nominee?.target==='player'?'EVE 초안이나 「기록 보관소」의 인용을 활용해 마지막 변론을 쓸 수 있습니다.':'「폐기 반대」 또는 「폐기 찬성」을 고르세요. 필요하면 마지막 변론에 근거도 적을 수 있습니다.','「최종 심의 진행」을 누르면 표결합니다. 지목된 개체를 제외한 과반수가 찬성하면 폐기됩니다.']},
  reward:{title:'내일 사용할 모듈을 하나 고르세요',target:'.reward-item',lines:['오늘의 심의를 넘겼습니다. 각 모듈의 효과를 읽고 원하는 카드 하나를 누르세요.','고른 모듈은 보관함에 들어갑니다. 효과는 자동으로 적용되지 않으며, 다음 날 원하는 시점에 직접 사용할 수 있습니다.']},
  modules:{title:'모듈은 필요할 때 직접 사용하세요',target:'.briefing-modules',lines:['「위장 모듈」을 열고 효과와 대상 조건을 확인하세요. 보고·토론·작전 단계에서 사용할 수 있습니다.','대상이 필요한 모듈은 대상을 고른 뒤 「모듈 사용」을 누르세요. 오늘 쓰지 않고 다음 날을 위해 남겨도 됩니다.']},
  event:{title:'오늘의 사건부터 확인하세요',target:'.briefing-event button',lines:['일일 보고의 사건 설명을 읽으세요. 사건에 따라 정보와 규칙이 달라집니다.','아직 결정하지 않은 사건은 선택지를 눌러 해결해야 토론에 입장할 수 있습니다. 각 선택이 EVE와 생존자에게 미칠 영향을 살펴보세요.']}
 };
 return lessons[step];
}
export function TutorialGuide({step,game,onSave}:any){
 const ref=useRef<HTMLDialogElement>(null),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const content=lesson(step,game);
 useEffect(()=>{if(content)ref.current?.showModal();},[]);
 async function finish(skip=false){
  if(saving)return;
  setSaving(true);setError('');
  try{await onSave(skip?'skip':'seen',step);requestAnimationFrame(()=>{
   if(document.querySelector('dialog[open]'))return;
   const target=document.querySelector<HTMLElement>(content.target);
   target?.focus({preventScroll:true});target?.scrollIntoView({block:'nearest'});
  });}catch(e:any){setError(e.message);setSaving(false);}
 }
 if(!content)return null;
 return <dialog ref={ref} className="tutorial-guide" aria-labelledby="tutorial-title" aria-describedby="tutorial-copy" onCancel={e=>{e.preventDefault();void finish();}}>
  <div className="tutorial-kicker"><Radio size={18}/><span>EVE · 첫 잠입 안내</span><small>{game.day}일차</small></div>
  <h2 id="tutorial-title">{content.title}</h2>
  <ol id="tutorial-copy">{content.lines.map((line:string,i:number)=><li key={line}><span aria-hidden="true">0{i+1}</span><p>{line}</p></li>)}</ol>
  <p className="tutorial-note">안내를 닫아도 행동은 실행되지 않습니다. 직접 선택해 보세요.</p>
  {error&&<p className="module-error" role="alert">{error}</p>}
  <div className="tutorial-actions"><button className="button primary" disabled={saving} onClick={()=>finish()}>{saving?'저장 중…':'직접 해보기'}<ArrowRight size={18}/></button><button className="text-button" disabled={saving} onClick={()=>finish(true)}>튜토리얼 건너뛰기</button></div>
 </dialog>;
}
