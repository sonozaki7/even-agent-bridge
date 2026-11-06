import type {ReactNode} from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {Disclosure, Enter, Eyebrow, Mark, ff, phase, useTall} from "../ui";
import "./engineering.css";

type IconName = "inbox" | "branch" | "check" | "question" | "quiet" | "terminal" | "archive" | "shield";

function Icon({name, size=24}:{name:IconName;size?:number}) {
  const paths: Record<IconName, ReactNode> = {
    inbox: <><path d="M4 4h16l2 10v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5z"/><path d="M2 14h6l1.5 2.5h5L16 14h6"/></>,
    branch: <><path d="M6 6v12M18 6c0 6-3 7-9 7H6"/><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/></>,
    check: <path d="m5 12 4.5 4.5L19 7"/>,
    question: <><circle cx="12" cy="12" r="9"/><path d="M9.3 9.1a2.8 2.8 0 1 1 4.5 2.2c-1.5 1-1.8 1.5-1.8 2.6m0 3h.01"/></>,
    quiet: <><path d="M9 18h-5l2-3v-5a6 6 0 0 1 2-4.5M11 4a6 6 0 0 1 7 6v4m-8 7h4m-5-3h8m-14-14 18 18"/></>,
    terminal: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3m6 0h4"/></>,
    archive: <><rect x="4" y="4" width="16" height="5" rx="1"/><path d="M5.5 9v10h13V9M10 13h4"/></>,
    shield: <><path d="M12 2.5 20 6v5.5c0 4.7-3.7 7.8-8 10-4.3-2.2-8-5.3-8-10V6z"/><path d="m8.5 12 2.3 2.3 4.7-4.7"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Stage({children}:{children:ReactNode}) {
  return <AbsoluteFill className="eng-stage">
    <div className="eng-grid"/>
    {children}
    <Disclosure>CONCEPT UI  /  FICTIONAL ENGINEERING WORKFLOW</Disclosure>
  </AbsoluteFill>;
}

function Heading({label,children}:{label:string;children:ReactNode}) {
  return <div className="eng-heading"><Enter duration={15} rise={12}>
    <Eyebrow>{label}</Eyebrow><h2>{children}</h2>
  </Enter></div>;
}

function Brand() {
  return <div className="eng-brand"><Mark size={30}/><span>T3 Code</span></div>;
}

function Chip({children,kind=""}:{children:ReactNode;kind?:string}) {
  return <span className={`eng-chip ${kind}`}>{children}</span>;
}

function Quiet({children="No wearable alert for routine work"}:{children?:ReactNode}) {
  return <div className="eng-quiet"><Icon name="quiet"/><span>{children}</span></div>;
}

const items = [
  { group:"Needs your input", title:"Mobile Sync API v2", meta:"Codex", activity:"Compatibility decision", icon:"question", kind:"attention" },
  { group:"Working", title:"Cache warmup", meta:"Claude Code", activity:"Running tests", icon:"branch", kind:"working" },
  { group:"Settled", title:"Fix retry backoff", meta:"PR #241 merged", activity:"History kept", icon:"archive", kind:"settled" },
] as const;

function InboxRows({phone=false}:{phone?:boolean}) {
  const f = useCurrentFrame();
  return <div className="eng-inbox-rows">
    {items.map((item,i) => {
      const entrance = phase(f, 5 + i * 5, 20 + i * 6);
      const working = phase(f, 33, 180);
      return <div className={`eng-group ${item.kind}`} key={item.title} style={{opacity:entrance,transform:`translateY(${(1-entrance)*7}px)`}}>
        <div className="eng-group-label">{item.group}</div>
        <div className="eng-row">
          <span className="eng-row-icon"><Icon name={item.icon}/></span>
          <div className="eng-row-name"><strong>{item.title}</strong><small>{phone && item.kind === "settled" ? "History kept · PR #241 merged" : item.meta}</small></div>
          {!phone && <span className="eng-row-activity">{item.activity}</span>}
          {item.kind === "working" && <div className="eng-working-progress"><i style={{width:`${34+working*47}%`}}/></div>}
        </div>
      </div>;
    })}
  </div>;
}

function DesktopInbox() {
  return <div className="eng-window eng-desktop">
    <div className="eng-window-bar"><span className="eng-dots"><i/><i/><i/></span><Brand/><span className="eng-env"><i/> WORKSPACE</span></div>
    <div className="eng-desktop-body">
      <div className="eng-nav"><div>PROJECTS</div><strong><Icon name="inbox" size={21}/> Inbox</strong><span>Mobile API</span><span>Platform</span><span>History</span></div>
      <div className="eng-inbox">
        <div className="eng-inbox-top"><strong>Inbox</strong><Chip kind="eng-amber">1 NEEDS INPUT</Chip></div>
        <InboxRows/>
        <Quiet/>
      </div>
    </div>
  </div>;
}

function PhoneInbox() {
  return <div className="eng-phone">
    <div className="eng-phone-sensor"/>
    <div className="eng-phone-bar"><Brand/><span>PHONE</span></div>
    <div className="eng-phone-title">Inbox</div>
    <InboxRows phone/>
    <Quiet>Routine work stays here</Quiet>
  </div>;
}

export function Triage() {
  const tall = useTall();
  return <Stage>
    <Heading label="01 / THREAD TRIAGE">Not everything needs you.</Heading>
    <div className="eng-safe eng-triage">
      {!tall && <Enter duration={21} delay={3} rise={17}><DesktopInbox/></Enter>}
      <Enter duration={22} delay={tall ? 3 : 12} rise={22}><PhoneInbox/></Enter>
    </div>
  </Stage>;
}

function ThreadBar({right="CODEX"}:{right?:string}) {
  return <div className="eng-threadbar">
    <Brand/><span className="eng-breadcrumb">/ <span>Mobile Sync API v2</span></span>
    <Chip>{right}</Chip>
  </div>;
}

export function EngineeringThread() {
  return <Stage>
    <Heading label="02 / THE ENGINEERING DECISION">Old clients still speak v1.</Heading>
    <div className="eng-safe eng-thread">
      <Enter duration={17} delay={2} rise={16}>
        <div className="eng-window eng-thread-window">
          <ThreadBar/>
          <div className="eng-thread-body">
            <div className="eng-context">
              <div className="eng-mini-title">WHAT BREAKS</div>
              <div className="eng-text-big">Older installs send and expect v1 sync cursors.</div>
              <div className="eng-muted">If the endpoint accepts only v2, those installs may stop syncing.</div>
            </div>
            <div className="eng-api">
              <div className="eng-api-title"><Icon name="terminal"/><code>GET /sync</code><span>PROPOSED CONTRACT</span></div>
              <div className="eng-api-row"><span>No version requested</span><b>v1 cursor</b></div>
              <div className="eng-api-row"><span>Client opts into v2</span><b>v2 cursor</b></div>
            </div>
            <div className="eng-decision">
              <div className="eng-mini-title"><Icon name="question" size={21}/> SCOPE QUESTION</div>
              <div className="eng-options"><strong>Keep v1 for one release</strong><span>or</span><strong>Retire v1 now</strong></div>
            </div>
          </div>
        </div>
      </Enter>
    </div>
  </Stage>;
}

function RunRow({icon,title,detail,status,kind=""}:{icon:IconName;title:string;detail:string;status:string;kind?:string}) {
  return <div className="eng-run-row">
    <div className={`eng-row-icon ${kind}`}><Icon name={icon}/></div>
    <div className="eng-run-main"><strong>{title}</strong><small>{detail}</small></div>
    <Chip kind={kind}>{status}</Chip>
  </div>;
}

function Verification() {
  const f = useCurrentFrame();
  return <>
    <div className="eng-run-heading"><div><div className="eng-mini-title">COMPATIBILITY TESTS</div><div className="eng-text-big">One endpoint. Both clients.</div></div><Chip kind={f>=ff(1.5)?"eng-positive":""}>{f>=ff(1.5)&&<Icon name="check" size={19}/>} {f>=ff(1.5)?"2 PASSED":"TEST RUN"}</Chip></div>
    <div className="eng-run-rows">
      <RunRow icon="terminal" title="v1 legacy cursor roundtrip" detail="Old client sends v1 and receives v1 back" status={f>=ff(.5)?"PASSED":"RUNNING"} kind={f>=ff(.5)?"eng-positive":""}/>
      <RunRow icon="terminal" title="v2 cursor resume" detail="Opted-in client resumes at the next record" status={f>=ff(1.5)?"PASSED":"RUNNING"} kind={f>=ff(1.5)?"eng-positive":""}/>
    </div>
    <Quiet/>
  </>;
}

function PullRequest() {
  const f = useCurrentFrame();
  const checked = f>=ff(4.9);
  const policy = f>=ff(5.45);
  const merged = f>=ff(6.1);
  return <>
    <div className="eng-run-heading"><div><div className="eng-mini-title">PULL REQUEST #248</div><div className="eng-text-big">Preserve v1 for one release.</div></div><Chip kind={merged?"eng-positive":""}>{merged?"MERGED":"OPEN"}</Chip></div>
    <div className="eng-run-rows">
      <RunRow icon="check" title="Required checks" detail="v1 roundtrip · v2 resume" status={checked?"PASSED":"CHECKING"} kind={checked?"eng-positive":""}/>
      <RunRow icon="shield" title="Preauthorized merge policy" detail="Separate from the compatibility choice" status={policy?"MATCHED":"EVALUATING"} kind={policy?"eng-positive":""}/>
    </div>
    <Quiet>No new wearable alert or merge approval request</Quiet>
  </>;
}

function Settled() {
  return <>
    <div className="eng-run-heading"><div><div className="eng-mini-title">INBOX / SETTLED</div><div className="eng-text-big">Done, with a trail.</div></div><Chip kind="eng-positive"><Icon name="check" size={19}/> SETTLED</Chip></div>
    <div className="eng-run-rows">
      <RunRow icon="archive" title="Mobile Sync API v2" detail="PR #248 merged · Thread history retained" status="SETTLED" kind="eng-positive"/>
      <RunRow icon="branch" title="Cache warmup" detail="Claude Code · Continues in the background" status="WORKING"/>
    </div>
    <Quiet/>
  </>;
}

export function AutonomousRun() {
  const f = useCurrentFrame();
  const moment = f>=ff(7) ? "settled" : f>=ff(4.3) ? "pr" : "test";
  const caption = {test:"Let the agent do the work.",pr:"Checks first. Merge second.",settled:"Settled, not erased."}[moment];
  return <Stage>
    <Heading label="04 / AUTONOMOUS FOLLOW-THROUGH">{caption}</Heading>
    <div className="eng-safe eng-run">
      <Enter duration={16} delay={2} rise={12}>
        <div className="eng-window eng-run-window">
          <ThreadBar right="AGENT ACTIVITY"/>
          <div className="eng-run-body" key={moment} style={{opacity:.86+.14*phase(f,moment==="test"?0:moment==="pr"?ff(4.3):ff(7),(moment==="test"?0:moment==="pr"?ff(4.3):ff(7))+8)}}>
            {moment==="test" ? <Verification/> : moment==="pr" ? <PullRequest/> : <Settled/>}
          </div>
        </div>
      </Enter>
    </div>
  </Stage>;
}
