import Feature from 'ol/Feature.js';
import Polygon from 'ol/geom/Polygon.js';
import Point from 'ol/geom/Point.js';
import {neighborCounties} from './county-names.js';
import LineString from 'ol/geom/LineString.js';
import VectorSource from 'ol/source/Vector.js';
import VectorLayer from 'ol/layer/Vector.js';
import {Style,Fill,Stroke,Text} from 'ol/style.js';
import {fromLonLat} from 'ol/proj.js';
import {gameToLonLat} from './classify.js';

// The terrain extent is distinct from the purchasable tiles and outside connections.
export const CITY_HALF_SIZE=7168;
export const countyRing=[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([x,z])=>fromLonLat(gameToLonLat(x*CITY_HALF_SIZE,z*CITY_HALF_SIZE)));
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function boundaryAppearance(resolution){
 const level=Math.log2(Math.max(.01,resolution));
 const regional=smooth(1,5,level),far=smooth(7,10,level);
 return {width:1+regional*.8,opacity:(.26+regional*.39)*(1-far*.5),labelOpacity:smooth(2,4,level)*(1-smooth(6,8,level))};
}
export function createCountyContext(){
 const footprint=new Feature(new Polygon([countyRing]));
 const ground=new VectorLayer({source:new VectorSource({features:[footprint],wrapX:false}),style:new Style({fill:new Fill({color:'#e8edde'})})});
 const edge=new Feature(new LineString(countyRing));
 const label=new Feature(new Point(fromLonLat(gameToLonLat(0,CITY_HALF_SIZE))));label.setProperties({boundaryLabel:'TROPICANA COUNTY',offsetY:20});
 const neighbors=[['north',0,CITY_HALF_SIZE,0,-20,0],['west',-CITY_HALF_SIZE,0,0,-20,-Math.PI/2],['south',0,-CITY_HALF_SIZE,0,20,0],['east',CITY_HALF_SIZE,0,0,-20,Math.PI/2]].filter(([side])=>neighborCounties[side]).map(([side,x,z,offsetX,offsetY,rotation])=>{
  const f=new Feature(new Point(fromLonLat(gameToLonLat(x,z))));f.setProperties({boundaryLabel:neighborCounties[side].toUpperCase(),offsetX,offsetY,rotation,neighbor:true});return f;
 });
 const boundary=new VectorLayer({source:new VectorSource({features:[edge,label,...neighbors],wrapX:false}),declutter:true,updateWhileAnimating:true,updateWhileInteracting:true,style:(feature,res)=>{
  const s=boundaryAppearance(res);
  if(feature.get('boundaryLabel'))return s.labelOpacity>.01?new Style({text:new Text({text:feature.get('boundaryLabel'),placement:'point',font:'600 11px "Public Sans",sans-serif',offsetX:feature.get('offsetX')||0,offsetY:feature.get('offsetY')||0,rotation:feature.get('rotation')||0,fill:new Fill({color:`rgba(102,88,116,${s.labelOpacity})`}),stroke:new Stroke({color:`rgba(255,253,245,${s.labelOpacity*.9})`,width:3})})}):null;
  return [new Style({stroke:new Stroke({color:`rgba(255,253,245,${s.opacity*.8})`,width:s.width+2.4})}),new Style({stroke:new Stroke({color:`rgba(114,88,130,${s.opacity})`,width:s.width,lineDash:[8,5,2,5]})})];
 }});
 return {ground,boundary};
}
