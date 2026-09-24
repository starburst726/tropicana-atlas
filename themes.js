import {categories as originalCategories,classify} from './classify.js';
export const DEFAULTS_VERSION='4';
export const categories={...originalCategories,
 highways:['Transport','Highways & ramps','#d4944c',true],majorRoads:['Transport','Major roads','#e0b873',true],localRoads:['Transport','Local & service roads','#c7c1ae',true],pedestrianStreets:['Transport','Pedestrian streets','#b18b74',true],paths:['Transport','Paths','#817b59',true],
 powerPlants:['Utilities','Power plants','#c88738',false],substations:['Utilities','Substations','#b69042',false],powerLines:['Utilities','Power lines','#bd7540',false],
 schools:['Community','Schools','#528baa',true],healthcare:['Community','Medical facilities','#c96c81',true],fire:['Community','Fire & rescue','#ce8150',true],police:['Community','Police & prisons','#677da6',true],postal:['Community','Post offices','#9b83ab',false],pharmacies:['Community','Pharmacies','#bb8193',false],fishing:['Land use','Fishing areas','#438ca8',false]
};
export const serviceKeys=['schools','healthcare','fire','police','postal','pharmacies','services'];
export const utilityKeys=['powerPlants','substations','powerLines','utilities'];
export const landKeys=['residential','retail','food','entertainment','offices','manufacturing','logistics','extraction','agriculture','industrial'];
export const streetKeys=['highways','majorRoads','localRoads','pedestrianStreets'];
export const roadKeys=[...streetKeys,'paths','roads'];
export const routes=['bus','subway','tram','train','ferry','taxi'];
export function classifyThemed(p){
 if(p['map:area_class']==='fishing')return 'fishing';
 if(p.amenity==='pharmacy')return 'pharmacies';
 const base=classify(p);
 if(base==='roads'){
  const h=p['map:road_class']||p.highway;
  if(h==='footway')return 'paths';
  if(h==='pedestrian')return 'pedestrianStreets';
  if(/^(motorway|trunk)/.test(h))return 'highways';
  if(/^(primary|secondary)/.test(h))return 'majorRoads';
  return 'localRoads';
 }
 if(base==='utilities')return ({plant:'powerPlants',substation:'substations',line:'powerLines',minor_line:'powerLines',cable:'powerLines'})[p.power]||base;
 if(base==='services')return ({school:'schools',college:'schools',university:'schools',kindergarten:'schools',hospital:'healthcare',clinic:'healthcare',pharmacy:'pharmacies',fire_station:'fire',police:'police',prison:'police',post_office:'postal'})[p.amenity]||base;
 return base;
}
const context=['water','forest',...streetKeys,'rail','airports','places','parks'];
export const themes={
 explore:{label:'Explore',icon:'explore',description:'Get to know your county. Streets, neighborhoods and everyday destinations.',groups:[['Places to explore',['parks','food','entertainment']],['Community landmarks',serviceKeys]],defaults:[...context,'paths',...landKeys,...serviceKeys],focus:[],legend:['highways','majorRoads','parks','residential','retail']},
 roads:{label:'Roads & Parking',icon:'route',description:'Explore the street network and find exported parking areas.',groups:[['Streets',streetKeys],['Parking',['parking']]],collapsed:['Streets'],defaults:[...context,'paths','parking'],focus:[...streetKeys,'parking'],legend:[...streetKeys,'parking'],note:'Pedestrian streets remain part of the street network. Vehicle access permissions are not provided.'},
 transport:{label:'Transit & Paths',icon:'route',description:'Explore public transit and the paths connecting your county.',groups:[['Transit routes',routes],['Stations & stops',['stops']],['Paths & pedestrian streets',['paths','pedestrianStreets']],['Infrastructure',['rail','airports']]],collapsed:['Infrastructure'],defaults:[...context,'paths','subway','train','ferry','stops'],focus:['rail','airports','stops','paths','pedestrianStreets',...routes],legend:[...routes,'stops','paths','pedestrianStreets','rail','airports'],note:'Paths are shown as exported. Walking, cycling and vehicle access permissions are not provided.'},
 education:{label:'Education',icon:'local_library',description:'Find the schools serving Tropicana County.',groups:[['Education',['schools']]],defaults:[...context,'schools'],focus:['schools'],legend:['schools'],note:'School locations from the export; education levels, enrollment and catchment areas are not provided.'},
 healthcare:{label:'Healthcare',icon:'local_hospital',description:'Find medical facilities and pharmacies across the county.',groups:[['Healthcare',['healthcare','pharmacies']]],defaults:[...context,'healthcare'],focus:['healthcare','pharmacies'],legend:['healthcare','pharmacies'],note:'Exported facility locations; capacity and service coverage are not provided.'},
 civic:{label:'Safety & Civic',icon:'shield',description:'Find emergency services, correctional facilities and postal services.',groups:[['Public safety',['fire','police']],['Postal services',['postal']]],defaults:[...context,'fire','police','postal'],focus:['fire','police','postal'],legend:['fire','police','postal'],note:'Exported locations; service coverage and operating statistics are not included.'},
 leisure:{label:'Parks & Leisure',icon:'park',description:'Explore parks, attractions, dining and entertainment.',groups:[['Parks & attractions',['parks']],['Food & recreation',['food','entertainment']]],defaults:[...context],focus:['parks','food','entertainment'],legend:['parks','food','entertainment']},
 utilities:{label:'Utilities',icon:'bolt',description:'See the exported electricity infrastructure that serves Tropicana.',groups:[['Electricity',['powerPlants','substations','powerLines']],['Other infrastructure',['utilities']]],defaults:[...context,...utilityKeys],focus:utilityKeys,legend:utilityKeys,note:'Exported infrastructure only. Capacity, flow and complete grid connectivity are not included.'},
 land:{label:'Homes & Jobs',icon:'apartment',description:'Discover where people live, work, shop and produce.',groups:[['Homes',['residential']],['Business',['retail','food','entertainment','offices']],['Industry',['manufacturing','logistics','industrial']],['Rural & resources',['agriculture','extraction','fishing']]],defaults:[...context,...landKeys],focus:[...landKeys,'fishing'],legend:[...landKeys,'fishing']}
};
export const gettingAroundThemes=new Set(['explore','roads','education','healthcare','civic','utilities','leisure','land']);
export const contextTransitDefaults=['subway','train','ferry'];
export function normalizeLayers(keys,legacy=false){
 const result=new Set(keys.filter(k=>categories[k]));
 if(result.delete('roads')&&legacy)[...streetKeys,'paths'].forEach(k=>result.add(k));
 // Old links used broad service/utility classes. Expand them without losing data.
 if(legacy&&result.has('services'))serviceKeys.forEach(k=>result.add(k));
 if(legacy&&result.has('utilities'))utilityKeys.forEach(k=>result.add(k));
 return result;
}
export function defaultLayers(theme){return new Set(themes[theme].defaults);}
export function themeEmphasis(theme,category){
 if(category==='water')return 1;
 if(theme==='explore')return landKeys.includes(category)?.60:serviceKeys.includes(category)?.65:1;
 return themes[theme].focus.includes(category)?1:['water','forest','places',...roadKeys].includes(category)?.55:.22;
}
export function soften(color,amount){
 if(!color||amount>=1||!/^#[0-9a-f]{6}$/i.test(color))return color;
 const rgb=[1,3,5].map((i)=>Math.round(parseInt(color.slice(i,i+2),16)*amount+[232,237,222][(i-1)/2]*(1-amount)));
 return '#'+rgb.map(n=>n.toString(16).padStart(2,'0')).join('');
}

// Resolution is map metres per CSS pixel. Detailed points appear at neighborhood scale.
export function detailVisible(theme,category,props,resolution){
 if(category==='trees')return resolution<=2;
 if(['paths','pedestrianStreets','parking'].includes(category))return resolution<=7;
 if(roadKeys.includes(category)&&['mini_roundabout','turning_circle','turning_loop'].includes(props.highway))return resolution<6;
 if(category==='localRoads')return resolution<=14;
 if(category==='stops'){
  const major=props.railway==='station'||props.public_transport==='station'||props.amenity==='bus_station';
  return resolution<=(major?32:4);
 }
 if(theme==='explore'&&[...serviceKeys,'food','entertainment'].includes(category))return resolution<=4;
 return true;
}

export function layerAtScale(category,resolution){
 if(['paths','pedestrianStreets','parking'].includes(category))return resolution<=7;
 if(category==='localRoads')return resolution<=14;
 if(category==='stops')return resolution<=32;
 if(category==='trees')return resolution<=2;
 return true;
}
export function zoomHint(category,resolution){
 if(!layerAtScale(category,resolution))return 'Zoom in to see';
 if(category==='stops'&&resolution>4)return 'Zoom in for small stops';
 return '';
}
