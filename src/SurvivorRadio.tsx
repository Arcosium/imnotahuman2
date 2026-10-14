import {useState} from 'react';
import {Radio,ArrowUpRight} from '@phosphor-icons/react';

type Contact={id:string;name:string;role:string;status:string;lastHeardDay:number};
type Entry={id:string;day:number;contact:string;kind:string;text:string;spoken:boolean};
type Story={contacts:Contact[];entries:Entry[]};
const statusName:Record<string,string>={alive:'응답 수신',lost:'연락 두절',escaped:'탈출 확인',left:'방벽 안에 남음',unknown:'행방 미확인'};

function Transmission({contact,entry,ending=false}:{contact:Contact;entry:Entry;ending?:boolean}) {
  return <article className={'transmission '+(entry.spoken?'':'silent')}>
    <div className="transmission-label">
      <span className="voice-mark" aria-hidden="true">{contact.name[0]}</span>
      <div><b>{contact.name}</b><span>{contact.role}</span></div>
      <small>{ending?statusName[contact.status]:entry.spoken?`${entry.day}일차 · 무전`:`${entry.day}일차 · 연락 두절`}</small>
    </div>
    <p>{entry.spoken?`“${entry.text}”`:entry.text}</p>
  </article>;
}

export function SurvivorRadio({story,day,ending=false,onHistory}:{story:Story|null;day:number;ending?:boolean;onHistory:()=>void}) {
  const [expanded,setExpanded]=useState(false);
  if(!story?.contacts.length)return null;
  const latest=story.contacts.map(contact=>({contact,entry:[...story.entries].reverse().find(e=>e.contact===contact.id)!}));
  // Today's lost contact is shown first, so a new loss cannot hide in a fold.
  latest.sort((a,b)=>Number(b.entry.day===day&&b.entry.kind==='lost')-Number(a.entry.day===day&&a.entry.kind==='lost')||b.entry.day-a.entry.day);
  const shown=ending||expanded?latest:latest.slice(0,1);
  return <section className={'survivor-radio '+(ending?'radio-ending':'')} aria-label={ending?'생존자들의 마지막 소식':'생존자 비밀 무전'}>
    <div className="radio-heading"><Radio size={20}/><div><h3>{ending?'기억해야 할 이름들':'불씨의 목소리'}</h3><p>{ending?'이번 잠입에서 이어진 목소리':'당신에게만 닿는 무전 · 위치 비공개'}</p></div></div>
    {shown.map(({contact,entry})=><Transmission key={contact.id} contact={contact} entry={entry} ending={ending}/>)}
    <div className="radio-actions">
      {!ending&&latest.length>1&&<button type="button" className="text-button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'다른 목소리 접기':`다른 목소리 ${latest.length-1}명 더 읽기`}</button>}
      <button type="button" className="text-button" onClick={onHistory}>무전 기록 {story.entries.length}건<ArrowUpRight size={15}/></button>
    </div>
  </section>;
}

export function RadioArchive({story}:{story:Story}) {
  return <div className="radio-archive"><p className="radio-privacy">불씨의 비밀 무전입니다. 위원회 공식 기록과 분리해 보관합니다.</p>
    {story.contacts.map(c=><section className="voice-history" key={c.id}>
      <div className="voice-history-heading"><h3>{c.name} <span>{c.role}</span></h3><span>{statusName[c.status]}</span></div>
      <ol>{story.entries.filter(e=>e.contact===c.id).map(e=><li key={e.id}>
        <span>{e.day}일차 · {e.kind==='morning'?'아침 무전':e.kind==='after-search'?'수색 이후':e.kind==='ending'?'마지막 소식':'끊긴 회선'}</span>
        <p>{e.spoken?`“${e.text}”`:e.text}</p>
      </li>)}</ol>
    </section>)}
  </div>;
}
