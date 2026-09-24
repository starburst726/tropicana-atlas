// Derived display categories; original OSM tags remain untouched.
export const categories = {
 water:['Geography','Water','#a4d6df',true], forest:['Geography','Woodland','#9fc396',true], contours:['Geography','Contours','#b5a88d',false], trees:['Geography','Individual trees','#6b9564',false],
 roads:['Transport','Roads & paths','#d69950',true], rail:['Transport','Rail infrastructure','#77758a',true], airports:['Transport','Airports','#b1bdcc',true], stops:['Transport','Stations & stops','#507993',false],
 bus:['Transit routes','Bus','#bc7c38',false], subway:['Transit routes','Metro','#805aab',false], tram:['Transit routes','Tram','#a34870',false], train:['Transit routes','Train','#56666b',false], ferry:['Transit routes','Ferry','#438ca8',false], taxi:['Transit routes','Taxi','#c5a032',false], air:['Transit routes','Air (audit)','#9a7394',false],
 residential:['Land use','Residential','#dadfd0',true], retail:['Land use','Shops & commerce','#e4c3ae',true], food:['Land use','Food & hospitality','#dbbbaa',true], entertainment:['Land use','Entertainment & recreation','#dcbbce',true], offices:['Land use','Offices','#b4cfd5',true], manufacturing:['Land use','Manufacturing','#c8b6d6',true], logistics:['Land use','Warehouses & freight','#bdb2c4',true], extraction:['Land use','Extraction & quarries','#c6bca5',true], agriculture:['Land use','Agriculture','#d8dca7',true], industrial:['Land use','Other industry','#d4c7d9',true],
 parks:['Destinations','Parks & attractions','#a8cc9d',true], services:['Community','Public services','#b4cbc6',true], utilities:['Community','Utilities','#b7bbb0',false], parking:['Community','Parking','#d7d6cf',false], other:['Community','Other exported features','#dddacf',false], places:['Labels','District names','#214e4e',true]
};
export function classify(p) {
 const route=p.route||p.osm_export_route;
 if(route){if(/^Air line\b/i.test(p.name||''))return 'air';return ['bus','subway','tram','train','ferry','taxi','air'].includes(route)?route:'other';}
 if(p.place)return 'places';
 if(p.natural==='water'||p.waterway)return 'water';
 if(p.contour||p.ele && !p.highway && !p.building)return 'contours';
 if(p.natural==='tree')return 'trees';
 if(p.natural==='wood'||p.landuse==='forest')return 'forest';
 if(p.aeroway)return 'airports';
 if(p.public_transport||['bus_station','taxi'].includes(p.amenity)||['bus_stop','platform'].includes(p.highway)||['station','halt','platform'].includes(p.railway))return 'stops';
 if(p.highway)return 'roads';
 if(p.power||p.man_made||p.utility)return 'utilities';
 if(p.railway||p.landuse==='railway')return 'rail';
 if(p.amenity==='parking')return 'parking';
 if(p.leisure||p.tourism==='attraction'||p.tourism==='museum')return 'parks';
 if(['restaurant','cafe','fast_food'].includes(p.amenity)||p.tourism==='hotel')return 'food';
 if(['bar','arts_centre'].includes(p.amenity))return 'entertainment';
 if(p.office)return 'offices';
 if(p.industrial==='port'||p.port||['warehouse','depot'].includes(p.industrial))return 'logistics';
 if(p.industrial==='factory')return 'manufacturing';
 if(p.landuse==='quarry'||['oil','mine'].includes(p.industrial))return 'extraction';
 if(p.landuse==='farmland'||p.landuse==='farmyard')return 'agriculture';
 if(p.industrial||p.landuse==='industrial')return 'industrial';
 if(p.shop||p.landuse==='commercial')return 'retail';
 if(p.amenity)return 'services';
 if(p.landuse==='residential')return 'residential';
 return 'other';
}
export function gameToLonLat(x,z,north='North') {
 const pair=({North:[x,z],East:[-z,x],South:[-x,-z],West:[z,-x]})[north];
 if(!pair||!pair.every(Number.isFinite))throw new Error('Invalid camera coordinates');
 return pair.map(v=>v/111000);
}
export function cameraHeading(camera,north='North') {
 const a=gameToLonLat(camera.position.x,camera.position.z,north),b=gameToLonLat(camera.pivot.x,camera.pivot.z,north);
 return Math.atan2(b[0]-a[0],b[1]-a[1]);
}
export function ageState(age){return age>10000?'hidden':age>3000?'stale':'live';}
