import {AbsoluteFill, Sequence, useCurrentFrame} from "remotion";
import {Disclosure, Enter, Eyebrow, InterfaceScan, Mark, Plate, ff, phase, useTall} from "../ui";

export function Open() {
  const f=useCurrentFrame();
  const tall=useTall();
  return <>
    <Plate name="desk" focusTall="76% center" seconds={6} pan={-13}/>
    <AbsoluteFill className="lead-vignette"/>
    <div className="folio"><Mark/><span>AGENT RELAY<br/><b>PRODUCT CONCEPT</b></span></div>
    <div className="lead">
      <Enter delay={5}><Eyebrow>THE NEXT INTERFACE</Eyebrow></Enter>
      <Enter delay={12}><h1>The future of coding<br className="desktop-only"/> doesn’t need<br className="desktop-only"/> a desk.</h1></Enter>
    </div>
    {!tall&&<div className="telemetry" style={{opacity:phase(f,26,59)}}>
      <span><i/> BUILD</span><span><i/> TEST</span><span><i/> REVIEW</span>
    </div>}
  </>;
}

export function Departure() {
  return <>
    <Plate name="departure" focusTall="71% center" seconds={3.3} pan={-8} zoom={.12}/>
    <AbsoluteFill className="lead-vignette" style={{opacity:.74}}/>
    <div className="lead departure">
      <Enter delay={8}><Eyebrow>02 / STEP OUT</Eyebrow></Enter>
      <Enter delay={14}><h1>Leave the desk.<br/>Not the work.</h1></Enter>
    </div>
  </>;
}

type HudKind = "overview"|"alert"|"queued"|"build"|"review"|"final";

function Hud({kind}:{kind:HudKind}) {
  const f=useCurrentFrame();
  const text:Record<HudKind,[string,string,string]> = {
    overview:["T3 CODE  /  AGENT RELAY","3 agents active","Build · Tests · Review"],
    alert:["CODEX  /  TEST RUNNER","Tests complete.","›  Run final checks"],
    queued:["CODEX  /  TEST RUNNER","Final checks running","✓  Request confirmed"],
    build:["CODEX  /  BUILD","UI build complete","✓  Ready for review"],
    review:["CLAUDE CODE  /  REVIEW","Review ready","2 notes for later"],
    final:["CODEX  /  TEST RUNNER","Final checks passed","✓  Nothing needs you"],
  };
  const [head, title, note]=text[kind];
  const x=phase(f,4,21);
  return <div className={`hud hud-${kind}`} style={{opacity:x,transform:`translate3d(0,${12*(1-x)}px,0)`}}>
    <span className="hud-corner top-left"/><span className="hud-corner bottom-right"/>
    <div className="hud-kicker"><Mark size={26}/>{head}</div>
    <div className="hud-title">{title}</div>
    <div className={`hud-note ${kind==="alert"?"hud-choice":""}`}>{note}</div>
    <InterfaceScan at={5} duration={21} top={-7} bottom={-7}/>
  </div>;
}

function Pov({name="pov",kind,seconds,focusTall="52% center",position,offset=0}:{
  name?:string;kind:HudKind;seconds:number;focusTall?:string;position?:"left";offset?:number;
}) {
  return <>
    <Plate name={name} focusTall={focusTall} seconds={seconds} offset={offset} pan={-15} shade={.16} walk={name==="bridgewalk"||name==="city"}/>
    <div className={`hud-stage ${position==="left"?"hud-stage-left":""}`}><Hud kind={kind}/></div>
    <Disclosure/>
  </>;
}

function Ring() {
  const f=useCurrentFrame();
  const selected=phase(f,ff(.9),ff(1.2));
  const pulse=phase(f,ff(.9),ff(1.65));
  return <>
    <Plate name="ring" focusTall="68% center" seconds={2.6} pan={-15} zoom={.11}/>
    <AbsoluteFill className="lead-vignette" style={{opacity:.8}}/>
    <div className="ring-cue">
      <Enter delay={2}><Eyebrow>EVEN R1 / CONCEPT INPUT</Eyebrow></Enter>
      <Enter delay={7}><div className="ring-action" style={{background:`rgba(143,232,131,${.07+selected*.16})`, borderColor:`rgba(184,253,168,${.27+selected*.5})`}}>
        <div className="touch-orb" style={{boxShadow:`0 0 0 ${pulse*24}px rgba(184,253,168,${selected*(1-pulse)*.4})`}}/>
        Run final checks
      </div></Enter>
      <Enter delay={10}><div className="ring-note">{f<ff(.9)?"Select on ring":"Confirm before sending"}</div></Enter>
    </div>
    <Disclosure/>
  </>;
}

export function FirstPerson() {
  return <Pov kind="overview" seconds={7.5}/>;
}

export function Interaction() {
  return <>
    <Sequence from={0} durationInFrames={ff(3.8)}><Pov kind="alert" seconds={7.5} offset={3.7}/></Sequence>
    <Sequence from={ff(3.8)} durationInFrames={ff(2.6)}><Ring/></Sequence>
    <Sequence from={ff(6.4)} durationInFrames={ff(3.6)}><Pov name="pov" kind="queued" seconds={3.6} focusTall="60% center"/></Sequence>
  </>;
}

export function Montage() {
  return <>
    <Sequence from={0} durationInFrames={ff(3.3)}><Pov name="bridgewalk" kind="build" seconds={3.3} focusTall="55% center"/></Sequence>
    <Sequence from={ff(3.3)} durationInFrames={ff(3.4)}><Pov name="cafe" kind="review" position="left" seconds={3.4} focusTall="66% center"/></Sequence>
    <Sequence from={ff(6.7)} durationInFrames={ff(3.3)}><Pov name="city" kind="final" seconds={3.3} focusTall="51% center"/></Sequence>
  </>;
}

export function Reveal({cover=false}:{cover?:boolean}) {
  const f=useCurrentFrame();
  const tall=useTall();
  const a=cover?1:phase(f,7,35);
  const b=cover?1:phase(f,17,50);
  return <>
    {tall?<div className="portrait-hero"><Plate name="hero" focusTall="99% center" seconds={9} pan={-6} zoom={.037}/></div>:<Plate name="hero" seconds={9} pan={-9} zoom={.046}/>}
    <AbsoluteFill className="reveal-vignette"/>
    <div className="folio"><Mark/><span>AGENT RELAY<br/><b>INDEPENDENT CONCEPT</b></span></div>
    <div className="reveal-copy">
      <div style={{opacity:a}}><Eyebrow>T3 CODE × EVEN G2 × EVEN R1</Eyebrow></div>
      <h1 style={{opacity:b,transform:`translateY(${(1-b)*24}px)`}}>
        {cover?<>The future of coding<br/>doesn’t need a desk.</>:<>Your agents<br/>keep working.<br/><em>Your world<br/>keeps moving.</em></>}
      </h1>
      {!cover&&<div className="credit" style={{opacity:phase(f,ff(4.7),ff(5.7))}}>CONCEPT FILM <span>·</span> AI-GENERATED NARRATION<br/>SIMULATED INTERACTIONS <span>·</span> NO HARDWARE TEST</div>}
    </div>
  </>;
}
