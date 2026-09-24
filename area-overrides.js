// Reviewed geometry rules survive OSM ID changes, but changed areas need review.
export function applyAreaOverrides(features,rules){
 const applied=[],unmatched=[],ambiguous=[];
 const water=features.filter(f=>f.get('natural')==='water').map(f=>f.getGeometry());
 const farmland=features.filter(f=>f.get('landuse')==='farmland'&&f.getGeometry().getType()==='Polygon');
 for(const rule of rules){
  const candidates=farmland.filter(f=>{const g=f.getGeometry(),bounds=g.getExtent();
   return bounds.every((v,i)=>Math.abs(v-rule.bounds[i])*111000<=rule.toleranceMetres)&&Math.abs(g.getArea()/rule.area-1)<.02&&water.some(w=>w.intersectsCoordinate(g.getInteriorPoint().getCoordinates()));
  });
  if(candidates.length!==1){(candidates.length?ambiguous:unmatched).push(rule.id);continue;}
  const f=candidates[0];f.set('map:original_landuse',f.get('landuse'));f.set('map:area_class','fishing');f.set('map:correction',rule.reason);applied.push(rule.id);
 }
 return {applied,unmatched,ambiguous};
}
