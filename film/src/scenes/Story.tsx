import {AbsoluteFill, Sequence, useCurrentFrame} from "remotion";
import {Disclosure, Enter, Eyebrow, InterfaceScan, Mark, Plate, ff, phase, useTall} from "../ui";

export function Open() {
  return <>
    <Plate name="desk" focusTall="76% center" seconds={6} pan={-13}/>
    <AbsoluteFill className="lead-vignette"/>
    <div className="folio"><Mark/><span>AGENT RELAY<br/><b>PRODUCT CONCEPT</b></span></div>
    <div className="lead opening">
      <Enter delay={7} duration={16}><div className="opening-intro">Let me show you</div></Enter>
      <Enter delay={10} duration={22}><h1>what I want to do<br/>with G2,<br/><em>alongside T3 Code.</em></h1></Enter>
    </div>
  </>;
}

export function Departure() {
  return <>
    <Plate name="departure" focusTall="71% center" seconds={1.6} pan={-4} zoom={.04}/>
    <AbsoluteFill className="lead-vignette" style={{opacity:.74}}/>
    <div className="lead departure">
      <Enter delay={1} duration={12}><Eyebrow>03 / ONE QUESTION. NOT A STATUS FEED.</Eyebrow></Enter>
    </div>
  </>;
}

type HudKind = "risk"|"decision"|"answered";

function Hud({kind}:{kind:HudKind}) {
  const f=useCurrentFrame();
  const select=phase(f,ff(1.05),ff(1.25));
  const x=phase(f,kind==="risk"?8:0,kind==="risk"?21:11);
  return <div className={`hud decision-hud hud-${kind}`} style={{opacity:x,transform:`translate3d(0,${10*(1-x)}px,0) rotateX(-2deg)`}}>
    <span className="hud-corner top-left"/><span className="hud-corner bottom-right"/>
    <div className="hud-kicker"><Mark size={26}/>{kind==="answered"?"SYNC API V2":"T3 CODE  /  NEEDS YOUR INPUT"}</div>
    {kind==="risk"&&<>
      <div className="hud-title">Mobile Sync API v2</div>
      <div className="hud-note">Older apps lose sync<br/>if v1 is retired now.</div>
    </>}
    {kind==="decision"&&<>
      <div className="hud-title">Keep older apps syncing?</div>
      <div className="hud-options">
        <div className="hud-option" style={{background:`rgba(184,253,168,${.06+select*.15})`,borderColor:`rgba(184,253,168,${.2+select*.8})`}}><span>{select>.5?"›":"○"}</span> Keep v1 for one release</div>
        <div className="hud-option hud-option-secondary"><span>○</span> Retire v1 now</div>
      </div>
    </>}
    {kind==="answered"&&<>
      <div className="hud-title">Answer sent <span aria-hidden="true">✓</span></div>
      <div className="hud-note">Keep v1 for one release</div>
      <div className="hud-detail">Migration continues</div>
    </>}
    <InterfaceScan at={kind==="risk"?8:2} duration={15} top={-7} bottom={-7}/>
  </div>;
}

function Pov({kind,offset=0}:{kind:HudKind;offset?:number}) {
  return <>
    <Plate name="pov" focusTall="52% center" seconds={10} offset={offset} pan={-15} shade={.18}/>
    <div className="hud-stage"><Hud kind={kind}/></div>
    <Disclosure/>
  </>;
}

function Ring() {
  const f=useCurrentFrame();
  const pulse=phase(f,ff(.4),ff(1.35));
  const confirmed=phase(f,ff(.4),ff(.68));
  return <>
    <Plate name="ring" focusTall="68% center" seconds={2.65} pan={-15} zoom={.11}/>
    <AbsoluteFill className="lead-vignette" style={{opacity:.8}}/>
    <div className="ring-cue ring-decision">
      <Enter delay={1} duration={14}><Eyebrow>EVEN R1 / ANSWER THREAD</Eyebrow></Enter>
      <Enter delay={2} duration={16}><div className="ring-action" style={{background:`rgba(143,232,131,${.08+confirmed*.17})`, borderColor:`rgba(184,253,168,${.38+confirmed*.48})`}}>
        <div className="touch-orb" style={{boxShadow:`0 0 0 ${pulse*24}px rgba(184,253,168,${confirmed*(1-pulse)*.52})`}}/>
        Keep v1 for one release
      </div></Enter>
      <Enter delay={5} duration={17}><div className="ring-note">{f<ff(.6)?"Press to send answer":"Compatibility decision confirmed"}</div></Enter>
    </div>
    <Disclosure/>
  </>;
}

export function Interaction() {
  return <>
    <Sequence from={0} durationInFrames={ff(3.65)}><Pov kind="risk"/></Sequence>
    <Sequence from={ff(3.65)} durationInFrames={ff(6)-ff(3.65)}><Pov kind="decision" offset={3.65}/></Sequence>
    <Sequence from={ff(6)} durationInFrames={ff(8.65)-ff(6)}><Ring/></Sequence>
    <Sequence from={ff(8.65)} durationInFrames={ff(10)-ff(8.65)}><Pov kind="answered" offset={8.65}/></Sequence>
  </>;
}

export function Reveal({cover=false}:{cover?:boolean}) {
  const f=useCurrentFrame();
  const tall=useTall();
  const a=cover?1:phase(f,6,25);
  const b=cover?1:phase(f,10,36);
  return <>
    {tall?<div className="portrait-hero"><Plate name="hero" focusTall="99% center" seconds={9} pan={-6} zoom={.037}/></div>:<Plate name="hero" seconds={9} pan={-9} zoom={.046}/>}
    <AbsoluteFill className="reveal-vignette"/>
    <div className="folio"><Mark/><span>AGENT RELAY<br/><b>INDEPENDENT CONCEPT</b></span></div>
    <div className="reveal-copy revised-reveal">
      <div style={{opacity:a}}><Eyebrow>T3 CODE × EVEN G2 × EVEN R1</Eyebrow></div>
      <h1 style={{opacity:b,transform:`translateY(${(1-b)*24}px)`}}>
        Only the decisions<br/><em>that need you.</em>
      </h1>
      {cover?<div className="hero-deck">A G2 and R1 concept for T3 Code.</div>:<div className="credit" style={{opacity:phase(f,ff(4.7),ff(5.7))}}>CONCEPT FILM <span>·</span> AI-GENERATED NARRATION<br/>SIMULATED INTERACTIONS <span>·</span> NO HARDWARE TEST</div>}
    </div>
  </>;
}
