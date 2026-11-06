import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./style.css";
import {AbsoluteFill, Audio, Composition, Sequence, interpolate, registerRoot, staticFile, useCurrentFrame} from "remotion";
import {Dashboard} from "./scenes/Dashboard";
import {Departure, FirstPerson, Interaction, Montage, Open, Reveal} from "./scenes/Story";
import {clamp, ff, fps, useTall} from "./ui";
import captions from "./captions.json";

const sceneTable = [
  [0,6,Open],
  [6,14,Dashboard],
  [14,17.3,Departure],
  [17.3,21,FirstPerson],
  [21,31,Interaction],
  [31,41,Montage],
  [41,50,Reveal],
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
  const cutPulse=[6,14,17.3,41].reduce((n,at)=>Math.max(n,
    interpolate(f,[ff(at)-5,ff(at),ff(at)+9],[0,.72,0],clamp)),0);
  const black=Math.max(cutPulse,interpolate(f,[0,13],[1,0],clamp),interpolate(f,[ff(49.3),1499],[0,1],clamp));
  return <AbsoluteFill className={tall?"film tall":"film"}>
    {sceneTable.map(([start,end,Scene])=>
      <Sequence key={start} from={ff(start)} durationInFrames={ff(end)-ff(start)} premountFor={20}><Scene/></Sequence>)}
    <AbsoluteFill style={{background:"#050706",opacity:black,pointerEvents:"none"}}/>
    <Captions/>
    <Audio src={staticFile("audio/master-mix.mp3")}/>
  </AbsoluteFill>;
}

function Cover() {
  return <AbsoluteFill className="film"><Reveal cover/></AbsoluteFill>;
}

function Root() {
  return <>
    <Composition id="Landscape" component={Film} width={1920} height={1080} fps={fps} durationInFrames={ff(50)}/>
    <Composition id="Portrait" component={Film} width={1080} height={1920} fps={fps} durationInFrames={ff(50)}/>
    <Composition id="Cover" component={Cover} width={1920} height={1080} fps={fps} durationInFrames={1}/>
  </>;
}

registerRoot(Root);
