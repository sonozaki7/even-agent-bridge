import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {Disclosure, Enter, Eyebrow, Mark, clamp, ff, phase} from "../ui";

const agents = [
  {task:"Building UI",engine:"Codex",branch:"feat / account-shell",tag:"EDITING",accent:"#b8fda8",
    log:["Opening account view…","Added responsive navigation","Patched 3 components","UI build complete"],speed:1.15,offset:.17,glyph:"◇"},
  {task:"Running tests",engine:"Codex",branch:"test / checkout",tag:"RUNNING",accent:"#d8e8b6",
    log:["Starting checkout suite…","14 of 24 tests passed","21 of 24 tests passed","24 of 24 tests passed"],speed:1.06,offset:.21,glyph:"⌁"},
  {task:"Reviewing code",engine:"Claude Code",branch:"review / api-diff",tag:"READING",accent:"#b4c8ff",
    log:["Reading changes…","Checking auth boundary","Looking for regressions","2 review notes ready"],speed:.93,offset:.12,glyph:"≋"},
];

function AgentCard({agent,index}:{agent:typeof agents[number];index:number}) {
  const f=useCurrentFrame();
  const step=Math.min(3,Math.max(0,Math.floor((f-12-index*7)/(52/agent.speed))));
  const p=interpolate(f,[0,120,225],[agent.offset,.64*agent.speed,Math.min(1,agent.speed*.9)],clamp);
  return <Enter delay={15+index*8} rise={27} style={{minWidth:0}}>
    <div className="agent-card">
      <div className="agent-meta"><span style={{color:agent.accent}} className="agent-glyph">{agent.glyph}</span><span>{agent.engine}</span><b>0{index+1}</b></div>
      <div className="agent-title">{agent.task}</div>
      <div className="agent-branch">{agent.branch}</div>
      <div className="bar"><i style={{width:p*100+"%",background:agent.accent}}/></div>
      <div className="agent-tag"><i style={{background:agent.accent,boxShadow:`0 0 12px ${agent.accent}80`}}/>{step===3&&index===1?"PASSED":agent.tag}</div>
      <div className="agent-log">{agent.log[step]}</div>
    </div>
  </Enter>;
}

function Terminal() {
  const f=useCurrentFrame();
  const lines = [
    ['»','pnpm test --filter checkout',0],
    ['✓','checkout / creates a new session',1.05],
    ['✓','checkout / recovers from expired token',1.7],
    ['✓','checkout / validates currency totals',2.8],
    ['✓','24 passed · 0 failed',5.5],
  ] as const;
  return <div className="terminal">
    <div className="terminal-head"><span>⌘ &nbsp; ACTIVITY</span><span>WORKSTATION <i/></span></div>
    <div className="terminal-body">
      {lines.filter((l)=>f>=ff(l[2])+25).map(([symbol,label,ts])=><div key={label} style={{opacity:phase(f,ff(ts)+25,ff(ts)+41)}}><b>{symbol}</b>{label}</div>)}
      <div className="cursor" style={{opacity:Math.floor(f/12)%2===0?1:.22}}>▌</div>
    </div>
  </div>;
}

function Mobile() {
  const f=useCurrentFrame();
  const t=phase(f,ff(4.55),ff(5.7));
  if(t<=0)return null;
  return <div className="mobile-frame" style={{opacity:t,transform:`translate3d(${(1-t)*165}px,${(1-t)*85}px,0) rotate(${8-(1-t)*5}deg)`}}>
    <div className="phone-sensor"/>
    <div className="phone-brand"><Mark size={22}/> T3 Code <small>MOBILE</small></div>
    <div className="phone-head">Your agents</div>
    {agents.map((a,i)=><div className="phone-line" key={a.task}><i style={{background:a.accent}}/><div>{a.task}<small>{i===1&&f>ff(6.25)?"24 tests passed":a.engine}</small></div></div>)}
    <div className="phone-footer">SAME WORKSPACE</div>
  </div>;
}

export function Dashboard() {
  const f=useCurrentFrame();
  const entry=phase(f,0,27);
  return <AbsoluteFill className="dashboard-scene">
    <div className="grid-light"/>
    <div className="dash-head">
      <Enter delay={5}><Eyebrow>01 / START IN T3 CODE</Eyebrow></Enter>
      <Enter delay={11}><h2>Three agents. One workspace.</h2></Enter>
    </div>
    <div className="desktop-frame" style={{transform:`perspective(1900px) rotateX(${(1-entry)*7}deg) translateY(${(1-entry)*35}px) scale(${.97+entry*.03})`,opacity:entry}}>
      <div className="titlebar"><div className="lights"><i/><i/><i/></div><span><Mark size={24}/> T3 Code <b> / &nbsp;Workspace</b></span><span className="online"><i/> LOCAL WORKSPACE</span></div>
      <div className="dash-body">
        <aside className="desk-nav"><div>WORKSPACE</div><b><Mark size={19}/> Agents</b><span>⌗ &nbsp; Changes</span><span>↗ &nbsp; Reviews</span><div className="nav-env">ENVIRONMENT<br/><small>app / main</small></div></aside>
        <div className="dash-panel">
          <div className="dash-panel-title">Agent activity <span>3 SESSIONS</span></div>
          <div className="agents">{agents.map((agent,index)=><AgentCard key={agent.task} agent={agent} index={index}/>)}</div>
          <Terminal/>
        </div>
      </div>
    </div>
    <Mobile/>
    <Disclosure>ILLUSTRATIVE DESKTOP &amp; MOBILE UI</Disclosure>
  </AbsoluteFill>;
}
