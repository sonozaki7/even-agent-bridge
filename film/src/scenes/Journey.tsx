import type {ReactNode} from "react";
import {AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame} from "remotion";
import {Disclosure, Enter, Mark, clamp, ff, phase, useTall} from "../ui";

function Still({name,focus="center",portrait=focus,length=6,drift=15,darken=0,offset=0,crop=1}:{
  name:string;focus?:string;portrait?:string;length?:number;drift?:number;darken?:number;offset?:number;crop?:number;
}) {
  const f=useCurrentFrame()+ff(offset);
  const tall=useTall();
  const t=interpolate(f,[0,ff(length)],[0,1],clamp);
  return <AbsoluteFill className="journey-plate">
    <Img src={staticFile("stills/journey-"+name+".jpg")} style={{
      width:"100%",height:"100%",objectFit:"cover",objectPosition:tall?portrait:focus,
      transform:`translate3d(${t*drift}px,${-t*5}px,0) scale(${(1.027+t*.055)*(tall?1:crop)})`,
      transformOrigin:tall?portrait:focus,
    }}/>
    {darken>0&&<AbsoluteFill style={{background:`rgba(9,22,34,${darken})`}}/>}
  </AbsoluteFill>;
}

function Brand() {
  return <div className="journey-brand"><Mark size={37}/><span>AGENT RELAY<small>AN INDEPENDENT CONCEPT</small></span></div>;
}

function SceneLabel({number,children}:{number:string;children:ReactNode}) {
  return <div className="journey-label"><b>{number}</b><span>{children}</span></div>;
}

function Gesture({action,description,at=0}:{
  action:"Scroll"|"Tap"|"Open";description:string;at?:number;
}) {
  const f=useCurrentFrame();
  const p=phase(f,ff(at),ff(at+.8));
  const pulse=p>0&&p<1;
  return <div className="gesture">
    <div className="gesture-icon"><svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <ellipse cx="24" cy="25" rx="14" ry="12" stroke="currentColor" strokeWidth="2"/>
      <path d="M13 17l4-6h14l4 6M17 11v6h14v-6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      {pulse&&<circle cx="24" cy="15" r={4+13*p} opacity={1-p} stroke="currentColor" strokeWidth="2"/>}
      <circle cx="24" cy="15" r="2.8" fill="currentColor"/>
    </svg></div>
    <div><strong>{action}</strong><span>{description}</span></div>
  </div>;
}

type Row = {label:string;selected?:boolean};
function HUD({eyebrow,title,body,rows,hint}:{
  eyebrow:string;title:string;body?:ReactNode;rows?:Row[];hint?:string;
}) {
  return <Enter delay={3} duration={13} rise={8}>
    <div className="journey-hud">
      <div className="hud-rule" />
      <div className="hud-eyebrow">{eyebrow}</div>
      <div className="hud-title">{title}</div>
      {body&&<div className="hud-body">{body}</div>}
      {rows&&<div className="hud-rows">{rows.map(({label,selected})=><div key={label} className={selected?"selected":""}><b>{selected?">":" "}</b>{label}</div>)}</div>}
      {hint&&<div className="hud-hint">{hint}</div>}
      <div className="hud-rule last"/>
    </div>
  </Enter>;
}

export function JourneyOpen() {
  return <>
    <Still name="morning" portrait="75% center" length={5} drift={-10}/>
    <AbsoluteFill className="opening-wash"/>
    <Brand/>
    <div className="journey-open-title">
      <Enter delay={4} duration={19}><div className="title-note">T3 CODE <i/> EVEN G2 + R1</div></Enter>
      <Enter delay={8} duration={25}><h1>Take the decision.<br/>Leave the desk.</h1></Enter>
    </div>
  </>;
}

function Outside() {
  const f=useCurrentFrame();
  const opened=f>=ff(2.2);
  const later=f>=ff(8.3);
  const focused=f>=ff(5.55);
  return <>
    <Still name="walk" portrait="54% center" length={10.7} drift={-14} darken={.13}/>
    <AbsoluteFill className="look-wash"/>
    <SceneLabel number="01">A pause on the walk</SceneLabel>
    {opened&&<div className="hud-spot" key={later?"later":"prompt"}>
      {later?<HUD eyebrow="FASTER STATION SEARCH" title="Saved for later" body={<>Still waiting for your decision.</>}/>:
        <HUD eyebrow="T3 CODE / NEEDS YOUR INPUT" title="Faster station search" body={<>How should we release this?</>}
          rows={[{label:"Open question",selected:!focused},{label:"Later",selected:focused}]}/>}
    </div>}
    <div className="journey-action"><Gesture action={"Tap"}
      description={later?"Saved for later":focused?"Choose Later":opened?"Read the thread":"Stop, then open the thread"} at={8.3}/></div>
    <Disclosure>G2 VIEW / SIMULATED R1 INPUT</Disclosure>
  </>;
}

function PlatformCut() {
  return <><Still name="platform" portrait="57% center" length={1.35} drift={-20}/><div className="rail-cut"/></>;
}

export function WalkSequence() {
  return <>
    <Sequence durationInFrames={ff(10.7)}><Outside/></Sequence>
    <Sequence from={ff(10.7)} durationInFrames={ff(1.3)}><PlatformCut/></Sequence>
  </>;
}

function WaitIntro() {
  return <>
    <Still name="waitprofile" portrait="89% center" length={3.25} drift={-8}/>
    <AbsoluteFill className="wait-intro-wash"/>
    <SceneLabel number="02">Waiting for the Shinkansen</SceneLabel>
    <div className="wait-intro-copy">
      <Enter delay={6} duration={17}><h2>A few minutes<br/>before boarding.</h2></Enter>
      <Enter delay={16} duration={18}><p>No laptop to open.<br className="mobile-only"/> No phone to pull out.</p></Enter>
    </div>
  </>;
}

type Beat = "facts"|"options"|"question"|"reply"|"choose"|"sent";
const beats:Record<Beat,{number:string;name:string;tag:string;action:"Open"|"Scroll"|"Tap";instruction:string}> = {
  facts:{number:"02",name:"Waiting for the Shinkansen",tag:"REOPEN",action:"Tap",instruction:"Reopen the saved thread"},
  options:{number:"02",name:"Waiting for the Shinkansen",tag:"CHECK",action:"Scroll",instruction:"Read the options"},
  question:{number:"02",name:"Waiting for the Shinkansen",tag:"ASK",action:"Tap",instruction:"Choose a suggested question"},
  reply:{number:"02",name:"Waiting for the Shinkansen",tag:"A MOMENT LATER",action:"Open",instruction:"Read the answer"},
  choose:{number:"02",name:"Waiting for the Shinkansen",tag:"DECIDE",action:"Scroll",instruction:"Move to your answer"},
  sent:{number:"02",name:"Waiting for the Shinkansen",tag:"BACK TO WORK",action:"Tap",instruction:"No further action needed"},
};

function Station({beat,offset}:{beat:Beat;offset:number}) {
  const f=useCurrentFrame();
  const copy=beats[beat];
  const ask=f>=ff(3.6);
  const choose=f>=ff(2.4);
  const states:Record<Beat,ReactNode> = {
    facts:<HUD eyebrow="SAME THREAD / STATION SEARCH" title="Ready on newer phones" body={<>Older phones need<br/>more testing.</>}/>,
    options:<HUD eyebrow="FASTER STATION SEARCH" title="Who gets new search first?" rows={[
      {label:"Newer phones first",selected:!ask},{label:"Wait for everyone"},{label:"Ask a question",selected:ask},
    ]}/>,
    question:<HUD eyebrow="SUGGESTED QUESTION" title="Will search still work" body={<>on older phones?</>}
      rows={[{label:"Send question",selected:true}]}/>,
    reply:<HUD eyebrow="AGENT REPLY / STATION SEARCH" title="Yes." body={<>Older phones keep<br/>today’s search.</>}/>,
    choose:<HUD eyebrow="FASTER STATION SEARCH" title="Who gets new search first?" rows={[
      {label:"Newer phones first",selected:choose},{label:"Wait for everyone",selected:!choose},
    ]} hint={choose?"Tap to select":undefined}/>,
    sent:<HUD eyebrow="FASTER STATION SEARCH" title="Decision sent" body={<>Newer phones first.</>} hint="Agents continue the work"/>,
  };
  return <>
    <Still name="waiting" portrait="48% center" length={33} offset={offset} drift={-13} darken={.14}/>
    <AbsoluteFill className="look-wash"/>
    <SceneLabel number={copy.number}>{copy.name}</SceneLabel>
    <div className="step-index">{copy.tag}</div>
    <div className="hud-spot">{states[beat]}</div>
    {beat!=="sent"&&beat!=="reply"&&<div className="journey-action"><Gesture action={copy.action} description={copy.instruction} at={beat==="choose"?2.4:beat==="options"?3.6:0}/></div>}
    <Disclosure>G2 VIEW / SIMULATED R1 INPUT</Disclosure>
  </>;
}

function RingPress({kind,pressAt}:{kind:"question"|"decision";pressAt:number}) {
  const f=useCurrentFrame();
  const pressed=f>=ff(pressAt);
  return <>
    <Still name="ringwait" portrait="72% center" length={3.6} drift={-12}/>
    <AbsoluteFill className="ring-wash"/>
    <SceneLabel number="02">Waiting for the Shinkansen</SceneLabel>
    <div className="press-copy">
      <Enter delay={3} duration={16}><div className="step-index">{kind==="question"?"ASK A FOLLOW-UP":"CONFIRM YOUR DECISION"}</div></Enter>
      <Enter delay={7} duration={18}><h2>{kind==="question"?<>Will search still work<br/>on older phones?</>:<>Newer phones first.</>}</h2></Enter>
      <Enter delay={10} duration={17}><Gesture action="Tap" at={pressAt} description={pressed?(kind==="question"?"Question sent":"Decision sent"):(kind==="question"?"Send question":"Confirm and send")}/></Enter>
    </div>
    <Disclosure>EVEN R1 / SIMULATED INPUT</Disclosure>
  </>;
}

function Within({start,end,children}:{start:number;end:number;children:ReactNode}) {
  return <Sequence from={ff(start)} durationInFrames={ff(end)-ff(start)} premountFor={6}>{children}</Sequence>;
}

export function PlatformSequence() {
  return <>
    <Within start={0} end={3.25}><WaitIntro/></Within>
    <Within start={3.25} end={7.55}><Station beat="facts" offset={3.25}/></Within>
    <Within start={7.55} end={12}><Station beat="options" offset={7.55}/></Within>
    <Within start={12} end={14.3}><Station beat="question" offset={12}/></Within>
    <Within start={14.3} end={16.62}><RingPress kind="question" pressAt={1.6}/></Within>
    <Within start={16.62} end={22}><Station beat="reply" offset={16.62}/></Within>
    <Within start={22} end={26.7}><Station beat="choose" offset={22}/></Within>
    <Within start={26.7} end={30.28}><RingPress kind="decision" pressAt={1.8}/></Within>
    <Within start={30.28} end={33}><Station beat="sent" offset={30.28}/></Within>
  </>;
}

function CafePause() {
  return <>
    <Still name="cafepov" focus="100% center" portrait="49% center" crop={1.30} length={4.1} drift={-7} darken={.21}/>
    <AbsoluteFill className="look-wash"/>
    <SceneLabel number="03">A pause in the conversation</SceneLabel>
    <div className="hud-spot"><HUD eyebrow="MANUAL CHECK / T3 CODE" title="No decisions waiting" body={<>Agents are testing.</>}/></div>
    <Disclosure>G2 VIEW / SIMULATED R1 INPUT</Disclosure>
  </>;
}

export function Conversation() {
  return <>
    <Within start={0} end={4.45}>
      <Still name="cafe" portrait="30% center" length={4.45} drift={7}/>
      <SceneLabel number="03">Back in conversation</SceneLabel>
      <div className="quiet-note"><Enter delay={12} duration={20}>Routine work stays quiet.</Enter></div>
    </Within>
    <Within start={4.45} end={8.5}><CafePause/></Within>
  </>;
}

export function JourneyClose({cover=false}:{cover?:boolean}) {
  const tall=useTall();
  const f=useCurrentFrame();
  const a=cover?1:phase(f,4,21);
  return <>
    {tall?<div className="kit-portrait"><Still name="kit" portrait="96% center" length={5.7} drift={-8}/></div>:
      <Still name="kit" length={5.7} drift={-8}/>}
    <AbsoluteFill className="kit-wash"/>
    <Brand/>
    <div className="kit-copy" style={{opacity:a,transform:`translateY(${(1-a)*18}px)`}}>
      <div className="title-note">T3 CODE <i/> EVEN G2 + R1</div>
      <h1>Only the work<br/>that needs you.</h1>
      <div className="kit-credit">INDEPENDENT CONCEPT FILM<br/>SIMULATED WEARABLE INTERACTIONS<br/>AI-GENERATED NARRATION &amp; IMAGERY</div>
    </div>
  </>;
}
