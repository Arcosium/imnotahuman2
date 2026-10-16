import {useEffect,useRef,useState} from 'react';

const ambientVideo='/assets/title-loop-f2b4a5410b.mp4';

export function TitleBackground(){
 const [enabled,setEnabled]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&!(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData);
 const [playing,setPlaying]=useState(false);
 const video=useRef<HTMLVideoElement>(null);
 useEffect(()=>{
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const changed=()=>{if(preference.matches)setEnabled(false);};
  preference.addEventListener('change',changed);
  return()=>preference.removeEventListener('change',changed);
 },[]);
 useEffect(()=>{
  setPlaying(false);
  const element=video.current;if(!enabled||!element)return;
  let active=true;
  const update=()=>{if(document.hidden)element.pause();else element.play().catch(error=>{if(active&&!document.hidden&&error.name!=='AbortError')setEnabled(false);});};
  document.addEventListener('visibilitychange',update);update();
  return()=>{active=false;document.removeEventListener('visibilitychange',update);element.pause();};
 },[enabled]);
 return <>
  <div className="title-screen-art" aria-hidden="true">
   {enabled&&<video ref={video} className={playing?'playing':''} poster="/assets/council-chamber.png" muted loop playsInline preload="metadata" tabIndex={-1} onPlaying={()=>setPlaying(true)} onError={()=>{setPlaying(false);setEnabled(false);}}>
    <source src="/assets/title-loop-86b34b07cb.webm" type="video/webm"/>
    <source src={ambientVideo} type="video/mp4"/>
   </video>}
  </div>
  <button className="title-motion-toggle" aria-pressed={enabled} onClick={()=>setEnabled(value=>!value)}>{enabled?'배경 움직임 끄기':'배경 움직임 켜기'}</button>
 </>;
}
