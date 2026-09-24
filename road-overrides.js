export function applyRoadOverrides(features,rules){
 const applied=[],unmatched=[],ambiguous=[];
 const distance=(a,b)=>Math.hypot((a[0]-b[0])*111000,(a[1]-b[1])*111000);
 for(const rule of rules){
  const candidates=features.filter(f=>{const p=f.getProperties(),g=f.getGeometry();if(p.name!==rule.name||p.highway!==rule.original||g.getType()!=='LineString')return false;const c=g.getCoordinates();return Math.max(distance(c[0],rule.start),distance(c.at(-1),rule.end))<=rule.toleranceMetres||Math.max(distance(c.at(-1),rule.start),distance(c[0],rule.end))<=rule.toleranceMetres;});
  if(candidates.length!==1){(candidates.length?ambiguous:unmatched).push(rule.id);continue;}
  const f=candidates[0];f.set('map:original_highway',f.get('highway'));f.set('map:road_class',rule.display);f.set('map:correction',rule.reason);applied.push(rule.id);
 }
 return {applied,unmatched,ambiguous};
}
