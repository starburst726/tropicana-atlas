// Estimated ground coverage: calibrated lens, reported rotation, local ground plane.
export const lens={verticalFov:37.26,aspect:16/9};
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export function surfaceHeight(t,x,z){
 if(!t)return 406;
 const n=t.resolution,fx=Math.max(0,Math.min(n-1,(x-t.worldMin)/t.cellSize-.5)),fz=Math.max(0,Math.min(n-1,(z-t.worldMin)/t.cellSize-.5));
 const i=Math.floor(fx),j=Math.floor(fz),a=fx-i,b=fz-j;
 const h=(i,j)=>{const k=Math.min(j,n-1)*n+Math.min(i,n-1);return t.heights[k]+(t.waterDepths[k]||0);};
 return (h(i,j)*(1-a)+h(i+1,j)*a)*(1-b)+(h(i,j+1)*(1-a)+h(i+1,j+1)*a)*b;
}
export function cameraBasis(c){
 const yaw=c.angle.x*Math.PI/180,pitch=c.angle.y*Math.PI/180;
 return {eye:[c.position.x,c.position.y,c.position.z],forward:[Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)],right:[Math.cos(yaw),0,-Math.sin(yaw)],up:[Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),Math.cos(yaw)*Math.sin(pitch)]};
}
function clip(poly,side){
 const out=[];
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=side(a),db=side(b);if(da>=0)out.push(a);if((da>=0)!==(db>=0)){const u=da/(da-db);out.push(a.map((v,k)=>v+(b[k]-v)*u));}}
 return out;
}
export function projectCamera(c,terrain,field=lens){
 const basis=cameraBasis(c),{eye,forward,right,up}=basis;
 const min=terrain?.worldMin??-7168,max=terrain?.worldMax??7168;
 // Find the first ground/water intersection along the optical axis, inside the map.
 let aim=null,previous=null;
 for(let distance=0;distance<=60000;distance+=48){
  const p=eye.map((v,i)=>v+forward[i]*distance);
  if(p[0]<min||p[0]>max||p[2]<min||p[2]>max){previous=null;continue;}
  const delta=p[1]-surfaceHeight(terrain,p[0],p[2]);
  if(delta<=0&&previous!==null){let lo=previous,hi=distance;for(let n=0;n<12;n++){const d=(lo+hi)/2,q=eye.map((v,i)=>v+forward[i]*d);if(q[1]>surfaceHeight(terrain,q[0],q[2]))lo=d;else hi=d;}aim=eye.map((v,i)=>v+forward[i]*(lo+hi)/2);break;}
  if(delta<=0)break;previous=distance;
 }
 const ground=aim?aim[1]:surfaceHeight(terrain,c.pivot.x,c.pivot.z);
 const ty=Math.tan(field.verticalFov*Math.PI/360),tx=ty*field.aspect;
 let polygon=[[min,min],[max,min],[max,max],[min,max]];
 const projected=p=>{const d=sub([p[0],ground,p[1]],eye);return [dot(d,right),dot(d,up),dot(d,forward)];};
 // Clip the map against the view frustum. Horizon-facing rays never become bogus distant corners.
 for(const side of [q=>q[2]-.1,q=>q[2]*tx-q[0],q=>q[2]*tx+q[0],q=>q[2]*ty-q[1],q=>q[2]*ty+q[1]])polygon=clip(polygon,p=>side(projected(p)));
 return {eye:[eye[0],eye[2]],aim:aim?[aim[0],aim[2]]:null,polygon,ground,heading:c.angle.x*Math.PI/180};
}
