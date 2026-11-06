import type {CSSProperties, ReactNode} from "react";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

export const fps = 30;
export const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
export const ease = Easing.bezier(.22, .75, .2, 1);
export const phase = (f: number, a: number, b: number) =>
  interpolate(f, [a,b], [0,1], {...clamp, easing:ease});
export const ff = (seconds:number) => Math.round(seconds * fps);
export const useTall = () => useVideoConfig().height > useVideoConfig().width;

export function Mark({size=34}:{size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M4 27h7l6-14h7m-8 14h7l6-14h7M9 34h7l6-14h7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
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
