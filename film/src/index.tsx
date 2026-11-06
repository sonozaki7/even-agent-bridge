import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./style.css";
import {AbsoluteFill, Audio, Composition, Sequence, interpolate, registerRoot, staticFile, useCurrentFrame} from "remotion";
import {Threads, Receipt} from "./scenes/ThreadJourney";
import {Conversation, JourneyClose, JourneyOpen, PlatformSequence, WalkSequence} from "./scenes/Journey";
import {clamp, ff, fps, useTall} from "./ui";
import captions from "./captions.json";

const duration = 82;
const sceneTable = [
  [0,5,JourneyOpen],
  [5,17,Threads],
  [17,29,WalkSequence],
  [29,62,PlatformSequence],
  [62,70.5,Conversation],
  [70.5,76.3,Receipt],
  [76.3,duration,JourneyClose],
] as const;

function Captions() {
  const f=useCurrentFrame();
  const cue=captions.find(c=>f>=ff(c.start)&&f<ff(c.end));
  if(!cue)return null;
  return <div className="caption-wrap"><div className="caption">{cue.text}</div></div>;
}

function Film() {
  const f=useCurrentFrame();
  const tall=useTall();
  const white=Math.max(interpolate(f,[0,10],[1,0],clamp),interpolate(f,[ff(81.58),ff(duration)-1],[0,1],clamp));
  return <AbsoluteFill className={tall?"film tall":"film"}>
    {sceneTable.map(([start,end,Scene])=>
      <Sequence key={start} from={ff(start)} durationInFrames={ff(end)-ff(start)} premountFor={20}><Scene/></Sequence>)}
    <AbsoluteFill style={{background:"#f3f0e9",opacity:white,pointerEvents:"none"}}/>
    <Captions/>
    <Audio src={staticFile("audio/master-mix.mp3")}/>
  </AbsoluteFill>;
}

function Cover() {
  return <AbsoluteFill className="film"><JourneyClose cover/></AbsoluteFill>;
}

function Root() {
  return <>
    <Composition id="Landscape" component={Film} width={1920} height={1080} fps={fps} durationInFrames={ff(duration)}/>
    <Composition id="Portrait" component={Film} width={1080} height={1920} fps={fps} durationInFrames={ff(duration)}/>
    <Composition id="Cover" component={Cover} width={1920} height={1080} fps={fps} durationInFrames={1}/>
  </>;
}

registerRoot(Root);
