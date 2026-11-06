import type {CSSProperties, ReactNode} from "react";
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";

export const fps = 30;
export const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
export const ease = Easing.bezier(.22, .75, .2, 1);
export const phase = (f: number, a: number, b: number) =>
  interpolate(f, [a,b], [0,1], {...clamp, easing:ease});
export const ff = (seconds:number) => Math.round(seconds * fps);
export const useTall = () => useVideoConfig().height > useVideoConfig().width;
export const styles = {green:"#b8fda8", ink:"#f3f5ee", mute:"#a4aca3"};

export function Mark({size=34}:{size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M4 27h7l6-14h7m-8 14h7l6-14h7M9 34h7l6-14h7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}

export function Plate({name,focus="center", focusTall=focus, seconds=5, pan=12, zoom=.09, shade=.0, offset=0, walk=false}:{
  name:string; focus?:string;focusTall?:string;seconds?:number;pan?:number;zoom?:number;shade?:number;offset?:number;walk?:boolean;
}) {
  const f=useCurrentFrame();
  const tall=useTall();
  const time=f+ff(offset);
  const t=interpolate(time,[0,ff(seconds)],[0,1],clamp);
  const sway=walk?Math.sin(time/9)*3.5:0;
  const lift=walk?Math.sin(time/7)*3:0;
  return <AbsoluteFill style={{overflow:"hidden",backgroundColor:"#0b0e0b"}}>
    <Img src={staticFile("stills/"+name+".jpg")} style={{
      width:"100%",height:"100%",objectFit:"cover",objectPosition:tall?focusTall:focus,
      transform:`translate3d(${t*pan+sway}px,${-t*4+lift}px,0) scale(${1.027+t*zoom})`,transformOrigin:tall?focusTall:focus,
    }}/>
    <AbsoluteFill style={{background:`radial-gradient(ellipse at 53% 45%,transparent 35%,rgba(1,4,2,.54) 130%),rgba(2,5,2,${shade})`}}/>
  </AbsoluteFill>;
}

export function Eyebrow({children,style={}}:{children:ReactNode;style?:CSSProperties}) {
  return <div className="eyebrow" style={style}><i/>{children}</div>;
}

export function Disclosure({children="CONCEPT UI  /  SIMULATED INTERACTION"}:{children?:ReactNode}) {
  return <div className="disclosure">{children}</div>;
}

export function Enter({children,delay=0,duration=26,rise=24,style={}}:{
  children:ReactNode;delay?:number;duration?:number;rise?:number;style?:CSSProperties;
}) {
  const f=useCurrentFrame();
  const x=phase(f,delay,delay+duration);
  return <div style={{...style,opacity:x,transform:`translate3d(0,${(1-x)*rise}px,0)`}}>{children}</div>;
}

export function InterfaceScan({at=0, duration=18, left=0, right=0, top=0, bottom=0}:{
  at?:number;duration?:number;left?:number;right?:number;top?:number;bottom?:number;
}) {
  const f=useCurrentFrame();
  const x=phase(f,at,at+duration);
  return x>0&&x<1?<div style={{position:"absolute",pointerEvents:"none",left,right,top,bottom,
    opacity:Math.sin(x*Math.PI)*.37,
    background:`linear-gradient(180deg, transparent ${x*100-8}%,#aafa9c66 ${x*100}%,transparent ${x*100+2}%)`}}/>:null;
}
