// Deterministic labels from exported route geometry. No inferred connections.
export function compactRouteName(name,ref){
 const text=String(name||'').trim();
 return text?text.replace(/ Line \(([^)]+)\)$/,' \u00b7 $1'):ref?`Route ${ref}`:'';
}
export function collectRoutes(features,classify){
 return features.flatMap(f=>{
  const p=f.getProperties(),mode=p.route||p.osm_export_route;
  if(!mode)return [];
  const title=compactRouteName(p.name,p.ref),g=f.getGeometry(),type=g.getType();
  if(!title||!['LineString','MultiLineString'].includes(type))return [];
  return [{id:String(f.getId()||p.id||`${mode}:${p.ref||p.name}`),title,feature:f,category:classify(p),parts:type==='LineString'?[g.getCoordinates()]:g.getCoordinates(),color:p.colour||p.color}];
 }).sort((a,b)=>a.id.localeCompare(b.id));
}
function overlap(a,b){return a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];}
// Clip one segment to the viewport; gaps between exported parts are never crossed.
function clip(a,b,box){
 const dx=b[0]-a[0],dy=b[1]-a[1];let lo=0,hi=1;
 const p=[-dx,dx,-dy,dy],q=[a[0]-box[0],box[2]-a[0],a[1]-box[1],box[3]-a[1]];
 for(let i=0;i<4;i++){if(Math.abs(p[i])<1e-10){if(q[i]<0)return null;continue;}const t=q[i]/p[i];if(p[i]<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return null;}
 return [lo,hi];
}
export function placeRouteLabels(routes,{project,width,height,measure=s=>s.length*7,blocked=[],repeatDistance=420,maxPerRoute=3,maxTotal=Infinity}){
 if(width<80||height<80)return [];
 const viewport=[10,10,width-10,height-10],sets=[];
 for(const route of routes){
  const candidates=[],seen=new Set(),textWidth=measure(route.title)+12,textHeight=20;
  for(const part of route.parts){
   let distance=0;
   for(let i=1;i<part.length;i++){
    const a=project(part[i-1]),b=project(part[i]),dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    if(length<.01)continue;
    const range=clip(a,b,viewport);
    if(range){
     const from=distance+range[0]*length,to=distance+range[1]*length;
     const locations=[];
     for(let d=Math.ceil(from/96)*96;d<=to;d+=96)locations.push(d);
     // A short exported piece still supplies a candidate, not a mandatory label.
     if(!locations.length)locations.push((from+to)/2);
     for(const d of locations){
      const t=(d-distance)/length,x=a[0]+dx*t,y=a[1]+dy*t;
      const key=Math.round(x/12)+','+Math.round(y/12);if(seen.has(key))continue;seen.add(key);
      let rotation=Math.atan2(dy,dx);if(rotation>Math.PI/2)rotation-=Math.PI;if(rotation<-Math.PI/2)rotation+=Math.PI;
      // Steep segments get horizontal names for comfortable reading.
      if(Math.abs(rotation)>Math.PI/3)rotation=0;
      const bw=Math.abs(Math.cos(rotation))*textWidth+Math.abs(Math.sin(rotation))*textHeight;
      const bh=Math.abs(Math.sin(rotation))*textWidth+Math.abs(Math.cos(rotation))*textHeight;
      const box=[x-bw/2-5,y-bh/2-5,x+bw/2+5,y+bh/2+5];
      if(box[0]<viewport[0]||box[1]<viewport[1]||box[2]>viewport[2]||box[3]>viewport[3]||blocked.some(v=>overlap(v,box)))continue;
      candidates.push({route,coordinate:[part[i-1][0]+(part[i][0]-part[i-1][0])*t,part[i-1][1]+(part[i][1]-part[i-1][1])*t],pixel:[x,y],rotation,box,score:Math.hypot(x-width/2,y-height/2)});
     }
    }
    distance+=length;
   }
  }
  candidates.sort((a,b)=>a.score-b.score||a.pixel[0]-b.pixel[0]||a.pixel[1]-b.pixel[1]);
  if(candidates.length)sets.push({route,candidates,placed:[]});
 }
 // Give routes with fewer available positions first choice. Then round-robin repeats.
 sets.sort((a,b)=>Number(!!b.route.priority)-Number(!!a.route.priority)||a.candidates.length-b.candidates.length||a.route.id.localeCompare(b.route.id));
 const result=[];
 for(let round=0;round<maxPerRoute;round++)for(const set of sets){
  if(result.length>=maxTotal)return result;
  const candidate=set.candidates.find(c=>!result.some(p=>overlap(p.box,c.box))&&!set.placed.some(p=>Math.hypot(p.pixel[0]-c.pixel[0],p.pixel[1]-c.pixel[1])<repeatDistance));
  if(candidate){result.push(candidate);set.placed.push(candidate);}
 }
 return result;
}
