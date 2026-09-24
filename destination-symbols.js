// Viewer-only symbols inferred solely from exported categories and tags.
export const categorySymbols={schools:'school',healthcare:'local_hospital',pharmacies:'local_pharmacy',fire:'fire_truck',police:'local_police',postal:'mail',parking:'local_parking',stops:'metro',parks:'park',powerPlants:'bolt',substations:'electrical_services',utilities:'electrical_services',food:'restaurant',entertainment:'theater_comedy',airports:'flight'};
export function destinationSymbol(category,p={}){
 if(category==='police'&&p.amenity==='prison')return 'lock';
 if(category==='stops'){
  if(p.highway==='bus_stop'||p.amenity==='bus_station'||p.bus==='yes')return 'directions_bus';
  if(p.subway==='yes'||p.station==='subway')return 'subway';
  if(p.train==='yes')return 'train';
  if(p.ferry==='yes'||p.amenity==='ferry_terminal')return 'directions_boat';
  return 'metro';
 }
 if(category==='food'&&p.tourism==='hotel')return 'hotel';
 return categorySymbols[category]||null;
}
export function symbolVisible(category,p,resolution,focused,selected=false){
 if(!destinationSymbol(category,p))return false;
 if(selected)return true;
 const minor=category==='parking'||category==='pharmacies'||category==='food'||category==='entertainment';
 const majorStop=p.railway==='station'||p.public_transport==='station'||p.amenity==='bus_station';
 const limit=category==='stops'?(majorStop?8:2):minor?(focused?4:2):(focused?10:3);
 return resolution<=limit;
}
export function destinationAnchor(geometry){
 const type=geometry.getType();
 if(type==='Point')return geometry;
 if(type==='Polygon')return geometry.getInteriorPoint();
 if(type==='MultiPolygon')return geometry.getPolygons().sort((a,b)=>b.getArea()-a.getArea())[0]?.getInteriorPoint()||null;
 return null;
}

// Background geography is not a destination overlay. Stops/parking are explicit
// Getting around choices; selecting any exported facility may identify it.
export function themeAllowsSymbol(theme,category,focus,selected=false){
 return selected||theme==='explore'||focus.includes(category)||['stops','parking'].includes(category);
}

export function symbolInk(hex){return 'rgb('+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*.58)).join(',')+')';}
