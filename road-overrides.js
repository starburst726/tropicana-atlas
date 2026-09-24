export function applyRoadOverrides(features,rules){
 const applied=[],unmatched=[],ambiguous=[],speedRuleApplied=[];
 // Tropicana display convention approved after comparing Castlehill and Hillside.
 // Raw tags stay intact; specific reviewed overrides below take precedence.
 const linkClasses=new Set(['motorway_link','trunk_link','primary_link','secondary_link','tertiary_link']);
 for(const f of features){
  const p=f.getProperties();
  if(f.getGeometry().getType()!=='LineString'||!linkClasses.has(p.highway)||String(p.maxspeed)!=='30'||!['1','2'].includes(String(p.lanes))||p.oneway!=='yes')continue;
  f.set('map:original_highway',p.highway);
  f.set('map:road_class','service');
  f.set('map:correction','Tropicana display rule: 30 km/h, one or two lanes, one-way link shown as a service road; road asset type is not exported.');
  speedRuleApplied.push(f.getId());
 }
 const distance=(a,b)=>Math.hypot((a[0]-b[0])*111000,(a[1]-b[1])*111000);
 for(const rule of rules){
  const candidates=features.filter(f=>{const p=f.getProperties(),g=f.getGeometry();if(p.name!==rule.name||p.highway!==rule.original||g.getType()!=='LineString')return false;const c=g.getCoordinates();return Math.max(distance(c[0],rule.start),distance(c.at(-1),rule.end))<=rule.toleranceMetres||Math.max(distance(c.at(-1),rule.start),distance(c[0],rule.end))<=rule.toleranceMetres;});
  if(candidates.length!==1){(candidates.length?ambiguous:unmatched).push(rule.id);continue;}
  const f=candidates[0];f.set('map:original_highway',f.get('highway'));f.set('map:road_class',rule.display);f.set('map:correction',rule.reason);applied.push(rule.id);
 }
 return {applied,unmatched,ambiguous,speedRuleApplied};
}
