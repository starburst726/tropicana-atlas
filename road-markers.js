// Screen-sized road furniture, independent of the active theme.
export function roadMarkerAppearance(resolution){
 if(!Number.isFinite(resolution)||resolution>=6)return null;
 const t=Math.max(0,Math.min(1,(6-resolution)/4.5));
 const fade=t*t*(3-2*t);
 return {radius:1.2+.8*fade,alpha:.55*fade};
}
