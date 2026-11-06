import type {ReactNode} from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {Enter, ff, phase, useTall} from "../ui";
import "./thread-journey.css";

type Glyph = "search" | "sign-in" | "help" | "back" | "check" | "history" | "merge" | "more" | "question" | "threads" | "battery" | "plus";

function Icon({name,size=28}:{name:Glyph;size?:number}) {
  const paths:Record<Glyph,ReactNode> = {
    search:<><circle cx="10.8" cy="10.8" r="6.4"/><path d="m15.5 15.5 4.4 4.4"/></>,
    "sign-in":<><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5M12 15v1.5"/></>,
    help:<><path d="M12 6.8c-2.5-1.8-5.5-2.1-8-1v12c2.5-1.1 5.5-.8 8 1 2.5-1.8 5.5-2.1 8-1v-12c-2.5-1.1-5.5-.8-8 1zm0 0v12"/></>,
    back:<path d="m14.5 5-7 7 7 7"/>,
    check:<path d="m4.5 12.5 5 5L20 7"/>,
    history:<><path d="M4.2 10A8 8 0 1 1 6 17.5M4 5.5V10h4.5M12 8.3v4.2l2.5 1.7"/></>,
    merge:<><path d="M6 7v10m12-1c0-5-3-6-7.5-6H6"/><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="18" r="2"/></>,
    more:<><path d="M5 12h.01m6.99 0h.01m6.99 0h.01" strokeWidth="3.2"/></>,
    question:<><circle cx="12" cy="12" r="8.5"/><path d="M9.3 9.6a2.7 2.7 0 1 1 4 2.2c-1 .6-1.3 1-1.3 1.7m0 3h.01"/></>,
    threads:<><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8m-8 4h6"/></>,
    battery:<><path d="M2 8h18v8H2zM22 10v4"/><path d="M5 10h12v4H5z" fill="currentColor" stroke="none"/></>,
    plus:<path d="M12 5v14M5 12h14"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function JourneyMap({receipt}:{receipt:boolean}) {
  const f=useCurrentFrame();
  const progress=phase(f,8,receipt?55:260);
  return <svg className="tj-map" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <path d="M-92 820h460l130-130h414l184-184h364l216-216h322" className="tj-route-shadow"/>
    <path d="M-92 820h460l130-130h414l184-184h364l216-216h322" pathLength="100" strokeDasharray="100" strokeDashoffset={100*(1-progress)} className="tj-route-progress"/>
    <path d="M-65 940h532l190-190h198l113-113h610l178-178h300" className="tj-route-local"/>
    <path d="M-90 140h396l200 200h290l280 280h374l243 243h332" className="tj-route-local tj-route-secondary"/>
    <g className="tj-route-stops">
      <circle cx="498" cy="690" r="8"/><circle cx="912" cy="690" r="8"/><circle cx="1096" cy="506" r="8"/><circle cx="1676" cy="290" r="8"/>
    </g>
  </svg>;
}

function Stage({children,receipt=false}:{children:ReactNode;receipt?:boolean}) {
  const tall=useTall();
  return <AbsoluteFill className={`tj-stage ${tall?"tj-portrait":""} ${receipt?"tj-receipt":""}`}>
    <JourneyMap receipt={receipt}/>
    <div className="tj-layout">{children}</div>
  </AbsoluteFill>;
}

function Editorial({receipt=false}:{receipt?:boolean}) {
  const f=useCurrentFrame();
  const shift=receipt?0:phase(f,ff(9.02),ff(9.55));
  return <div className="tj-editorial">
    <Enter delay={3} duration={24} rise={13}>
      <div className="tj-kicker"><i/>{receipt?"03 / BACK IN THE SAME THREAD":"01 / START WITH THE THREADS"}</div>
      <div className="tj-headline-place">
        <div className="tj-headline-card" style={{opacity:1-shift, transform:`translateY(${-10*shift}px)`}}>
          <h2>{receipt?<>Checked.<br/>Merged.</>:<>One job.<br/>One conversation.</>}</h2>
          <p>{receipt?"Merged into the codebase, not released to phones.":"A T3 Code thread keeps the task and the conversation together."}</p>
        </div>
        {!receipt&&<div className="tj-headline-card tj-headline-overlay" style={{opacity:shift, transform:`translateY(${12*(1-shift)}px)`}}>
          <h2>One choice<br/>needs you.</h2>
          <p>The other threads keep their own pace.</p>
        </div>}
      </div>
      <div className="tj-route-key" aria-hidden="true">
        <div className="tj-route-key-line"><i/><i/><i className={receipt?"tj-route-key-here":""}/></div>
        <div className="tj-route-key-labels"><span>Task</span><span>Conversation</span><span>History</span></div>
      </div>
    </Enter>
  </div>;
}

function Phone({children}:{children:ReactNode}) {
  return <div className="tj-device-wrap">
    <Enter delay={4} duration={28} rise={19}>
      <div className="tj-phone">
        <div className="tj-statusbar"><span>9:41</span><i className="tj-sensor"/><Icon name="battery" size={29}/></div>
        {children}
        <div className="tj-bottom-nav">
          <span><Icon name="threads" size={19}/> Threads</span>
          <span><Icon name="plus" size={19}/> New task</span>
        </div>
        <div className="tj-home-bar" aria-hidden="true"/>
      </div>
      <div className="tj-disclosure">Illustrative T3 Code UI</div>
    </Enter>
  </div>;
}

function AppBar({inside=false}:{inside?:boolean}) {
  return <div className="tj-app-bar">
    <div>{inside?<><Icon name="back" size={22}/><span>Threads</span></>:<><Icon name="threads" size={24}/><span>T3 Code</span></>}</div>
    {inside?<Icon name="more" size={26}/>:<Icon name="search" size={24}/>}
  </div>;
}

function Status({value}:{value:"Working"|"Settled"|"Needs your input"}) {
  return <span className={`tj-status ${value==="Needs your input"?"tj-status-input":value==="Working"?"tj-status-working":"tj-status-settled"}`}><i/>{value}</span>;
}

function SearchThread({question}:{question:boolean}) {
  const f=useCurrentFrame();
  const asking=phase(f,ff(9),ff(9.4));
  const move=phase(f,ff(1.2),ff(8.8));
  return <div className={`tj-thread tj-search-thread ${question?"tj-search-needs":""}`} style={{boxShadow:question?`0 0 0 ${4*asking}px rgba(98,142,89,.1)`:undefined}}>
    <div className="tj-thread-title"><span className="tj-thread-icon"><Icon name="search"/></span><div><strong>Faster station search</strong><small>Codex</small></div></div>
    <div className="tj-thread-meta"><Status value={question?"Needs your input":"Working"}/><span className="tj-thread-chevron">›</span></div>
    {question?<div className="tj-question-line" style={{opacity:.58+.42*asking}}><Icon name="question" size={21}/>How should we release this?</div>:<div className="tj-work-progress" aria-hidden="true"><i style={{width:`${34+55*move}%`}}/></div>}
  </div>;
}

function OtherThread({help=false,compact=false}:{help?:boolean;compact?:boolean}) {
  return <div className={`tj-thread tj-other-thread ${compact?"tj-other-compact":""}`}>
    <div className="tj-thread-title">
      <span className="tj-thread-icon"><Icon name={help?"help":"sign-in"}/></span>
      <div><strong>{help?"Update help screens":"Fix sign-in"}</strong><small>{help?"History kept":"Claude Code"}</small></div>
    </div>
    <Status value={help?"Settled":"Working"}/>
  </div>;
}

export function Threads() {
  const f=useCurrentFrame();
  const question=f>=ff(9);
  return <Stage>
    <Editorial/>
    <Phone>
      <AppBar/>
      <div className="tj-mobile-body">
        <div className="tj-list-title"><span>STATION GUIDE</span><h3>Threads</h3></div>
        <div className="tj-thread-group">
          <div className="tj-group-label"><span>{question?"Needs your input":"Active"}</span><b>{question?"1":"2"}</b></div>
          <Enter delay={11} duration={16} rise={8}><SearchThread question={question}/></Enter>
        </div>
        <div className="tj-thread-group tj-continue-group">
          <div className="tj-group-label"><span>{question?"Working":"Also active"}</span>{question&&<b>1</b>}</div>
          <Enter delay={36} duration={17} rise={8}><OtherThread/></Enter>
        </div>
        <div className="tj-thread-group tj-settled-group">
          <div className="tj-group-label"><span>Settled</span><b>1</b></div>
          <Enter delay={71} duration={18} rise={8}><OtherThread help/></Enter>
        </div>
      </div>
    </Phone>
  </Stage>;
}

function ReceiptEvent({icon,children,kind=""}:{icon:Glyph;children:ReactNode;kind?:string}) {
  return <div className={`tj-receipt-event ${kind}`}><span><Icon name={icon} size={23}/></span><div>{children}</div></div>;
}

export function Receipt() {
  return <Stage receipt>
    <Editorial receipt/>
    <Phone>
      <AppBar inside/>
      <div className="tj-mobile-body tj-receipt-body">
        <div className="tj-list-title tj-receipt-title"><span>STATION GUIDE</span><h3>Faster station search</h3><div><small>Codex</small><Status value="Settled"/></div></div>
        <div className="tj-activity">
          <Enter delay={9} duration={14} rise={7}>
            <ReceiptEvent icon="question" kind="tj-reply-event"><span>Your reply:</span> <strong>Newer phones first</strong></ReceiptEvent>
          </Enter>
          <Enter delay={44} duration={14} rise={7}>
            <ReceiptEvent icon="merge" kind="tj-merge-event"><strong>Checks passed · Change merged</strong><small>Under existing repo rules</small></ReceiptEvent>
          </Enter>
          <Enter delay={57} duration={13} rise={7}>
            <ReceiptEvent icon="history"><strong>Conversation kept in history</strong></ReceiptEvent>
          </Enter>
        </div>
        <div className="tj-independent"><span>OTHER THREAD</span><OtherThread compact/></div>
      </div>
    </Phone>
  </Stage>;
}
