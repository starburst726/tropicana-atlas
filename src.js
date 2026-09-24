import {formatSnapshotDate,publicationLabel} from './snapshot-dates.js';
import {assetUrl,readJson,lazySnapshotLoader} from './snapshot-loader.js';
import {isBackgroundPlace,backgroundPlaceOpacity,backgroundPlaceColor} from './background-places.js';
import {destinationSymbol,symbolVisible,destinationAnchor,themeAllowsSymbol,symbolInk} from './destination-symbols.js';
import './style.css';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import Polygon from 'ol/geom/Polygon.js';
import LineString from 'ol/geom/LineString.js';
import {groundColor,contextColor,neutralThemes,buildRouteColors,routeColor,routeBadge,routeLabelPolicy} from './map-presentation.js';
import {roadMarkerAppearance} from './road-markers.js';
import {collectRoutes,placeRouteLabels} from './transit-labels.js';
import {projectCamera} from './projection.js';
import {applyRoadOverrides} from './road-overrides.js';
import {applyAreaOverrides} from './area-overrides.js';
import {createCountyContext} from './context.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import VectorSource from 'ol/source/Vector.js';
import VectorImageLayer from 'ol/layer/VectorImage.js';
import VectorLayer from 'ol/layer/Vector.js';
import {Style,Fill,Stroke,Circle,Text,Icon} from 'ol/style.js';
import {defaults,ScaleLine} from 'ol/control.js';
import {fromLonLat,toLonLat} from 'ol/proj.js';
import {getCenter,extend,createEmpty} from 'ol/extent.js';
import {gameToLonLat,cameraHeading,ageState} from './classify.js';
import {categories,classifyThemed,defaultLayers,normalizeLayers,themes,themeEmphasis,soften,utilityKeys,roadKeys,detailVisible,DEFAULTS_VERSION} from './themes.js';
import {renderThemeBar,renderThemePanel} from './theme-panel.js';

const $=s=>document.querySelector(s),mode=__PUBLIC_VIEWER__?'explore':new URLSearchParams(location.search).get('mode')||'explore';
const inset=mode==='inset';document.body.classList.add(mode);
if(!__PUBLIC_VIEWER__&&new URLSearchParams(location.search).get('capture')==='1'){
 document.documentElement.classList.add('broadcast-window');
 document.title='Tropicana Atlas - OBS';
}
if(__PUBLIC_VIEWER__){document.body.classList.add('public-view');if(matchMedia('(max-width:600px)').matches)document.body.classList.add('panel-closed');$('#map-help').textContent='Drag to explore · Scroll to zoom · City snapshot';$('#status').textContent='Loading map…';}
const initialHash=new URLSearchParams(location.hash.slice(1));
let backgroundPlaces=true;
try{backgroundPlaces=localStorage.getItem('tropicana-background-places-v1')!=='0';}catch{}
if(initialHash.has('background'))backgroundPlaces=initialHash.get('background')!=='0';
const legacyCommunity=initialHash.get('theme')==='community';
let currentTheme=legacyCommunity?'civic':themes[initialHash.get('theme')]?initialHash.get('theme'):'explore',themeMemory={};
try{const saved=JSON.parse(localStorage.getItem('tropicana-theme-filters-v'+DEFAULTS_VERSION)||'{}');if(saved&&typeof saved==='object')themeMemory=saved;}catch{}
const remembered=themeMemory[currentTheme];
const visible=Array.isArray(remembered)?normalizeLayers(remembered):defaultLayers(currentTheme);
const counts=new globalThis.Map(),routeColors=new globalThis.Map();
let routePalette=new globalThis.Map();
function rememberTheme(){themeMemory[currentTheme]=[...visible];try{localStorage.setItem('tropicana-theme-filters-v'+DEFAULTS_VERSION,JSON.stringify(themeMemory));}catch{}}
function setTheme(id){if(!themes[id]||id===currentTheme)return;rememberTheme();currentTheme=id;visible.clear();const saved=themeMemory[id];for(const k of Array.isArray(saved)?normalizeLayers(saved):defaultLayers(id))visible.add(k);selectionSource.clear();$('#info').hidden=true;selected=null;renderLayers();changed();}
function setLayers(keys,on){for(const k of keys)on?visible.add(k):visible.delete(k);if(selected&&!visible.has(bucket.get(selected))){selectionSource.clear();$('#info').hidden=true;selected=null;}renderLayers();changed();}

const bucket=new globalThis.Map(),styleCache=new globalThis.Map(),named=new globalThis.Map();
let snapshotManifest=null,snapshotLayers=null;
const extraLoads=new Set();
let all=[],following=inset,selected=null,ready=false,symbolFontReady=false;
const symbolAnchors=new WeakMap(),backgroundAreas=new WeakMap();
function backgroundOpacity(f,res){
 if(!backgroundPlaces||!isBackgroundPlace(bucket.get(f),themes[currentTheme])||!f.getGeometry().getType().includes('Polygon'))return 0;
 if(!backgroundAreas.has(f))backgroundAreas.set(f,f.getGeometry().getArea());
 return backgroundPlaceOpacity(backgroundAreas.get(f),res);
}
function featureAvailable(f,res){return isBackgroundPlace(bucket.get(f),themes[currentTheme])?backgroundOpacity(f,res)>0:visible.has(bucket.get(f));}

function hasDestinationSymbol(f,res){const cat=bucket.get(f);return symbolFontReady&&(visible.has(cat)||(f===selected&&backgroundOpacity(f,res)>0))&&themeAllowsSymbol(currentTheme,cat,themes[currentTheme].focus,f===selected)&&symbolVisible(cat,f.getProperties(),res,themes[currentTheme].focus.includes(cat),f===selected);}
function destinationStyle(f,res){
 if(!hasDestinationSymbol(f,res))return null;
 if(!symbolAnchors.has(f))symbolAnchors.set(f,destinationAnchor(f.getGeometry()));
 const anchor=symbolAnchors.get(f);if(!anchor)return null;
 const cat=bucket.get(f),symbol=destinationSymbol(cat,f.getProperties());
 const rgb=[1,3,5].map(i=>parseInt(categories[cat][2].slice(i,i+2),16));
 const ink=symbolInk(categories[cat][2]);
 const tint='rgb('+rgb.map((v,i)=>Math.round(v*.17+[255,253,245][i]*.83)).join(',')+')';
 // Image and text share one style so decluttering keeps each badge intact.
 return new Style({geometry:anchor,image:new Circle({radius:f===selected?16:15,fill:new Fill({color:tint}),stroke:new Stroke({color:f===selected?ink:'#fffdf5',width:f===selected?2.5:1.5})}),text:new Text({text:symbol,font:'400 20px "Material Symbols Rounded"',fill:new Fill({color:ink}),padding:[2,2,2,2],overflow:true})});
}
const source=new VectorSource({wrapX:false}),labels=new VectorSource({wrapX:false});
function labelStyle(f,res){
 if(f.get('route')||f.get('osm_export_route'))return null;
 const cat=bucket.get(f);
 if(!(visible.has(cat)||(f===selected&&backgroundOpacity(f,res)>0))||!detailVisible(currentTheme,cat,f.getProperties(),res))return null;
 if(destinationSymbol(cat,f.getProperties())&&!themeAllowsSymbol(currentTheme,cat,themes[currentTheme].focus,f===selected))return null;
 const district=cat==='places', road=roadKeys.includes(cat);
 const focused=currentTheme!=='explore'&&themes[currentTheme].focus.includes(cat);
 const majorStation=f.get('railway')==='station'||f.get('public_transport')==='station'||f.get('amenity')==='bus_station';
 const limit=road?(currentTheme==='roads'?(cat==='localRoads'?3:6):(cat==='localRoads'?1.5:3)):cat==='stops'?(majorStation?5:2):focused?4:1.3;
 if(!district&&res>limit&&f!==selected)return null;
 const name=f.get('name');if(!name)return null;
 return new Style({text:new Text({text:name,font:`${district?'600 13':'11'}px "Public Sans",sans-serif`,placement:road?'line':'point',offsetY:hasDestinationSymbol(f,res)?25:0,overflow:district,fill:new Fill({color:'#345756'}),stroke:new Stroke({color:'#fffdf3',width:3})})});
}
function style(f,res){
 const cat=bucket.get(f);
 if(isBackgroundPlace(cat,themes[currentTheme])){
  const opacity=backgroundOpacity(f,res);if(!opacity)return null;
  const color=backgroundPlaceColor(categories[cat][2],opacity),key='background:'+color;
  if(!styleCache.has(key))styleCache.set(key,new Style({zIndex:3,fill:new Fill({color})}));
  return styleCache.get(key);
 }
 if(!visible.has(cat)||cat==='places'||!detailVisible(currentTheme,cat,f.getProperties(),res))return null;
 if(cat==='fishing'){if(!styleCache.has('fishing'))styleCache.set('fishing',new Style({zIndex:4,fill:new Fill({color:'rgba(67,140,168,0.06)'}),stroke:new Stroke({color:'#438ca8',width:1.5,lineDash:[6,4]})}));return styleCache.get('fishing');}
 const p=f.getProperties(),type=f.getGeometry().getType(),area=type.includes('Polygon'),point=type==='Point';
 if(point&&roadKeys.includes(cat)){
  const marker=roadMarkerAppearance(res);if(!marker)return null;
  const key='road-marker:'+marker.radius.toFixed(2)+':'+marker.alpha.toFixed(2);
  if(!styleCache.has(key))styleCache.set(key,new Style({zIndex:11,image:new Circle({radius:marker.radius,fill:new Fill({color:`rgba(171,173,155,${marker.alpha})`})})}));
  return styleCache.get(key);
 }
 let fill=categories[cat][2],line,width=1,z=2,dash;
 if(cat==='water'){line='#8fc6d1';z=0;}
 else if(p.route||p.osm_export_route){
  const color=routeColor(p,routePalette),primary=currentTheme==='transport',w=primary?3.1:1.65,level=primary?25:15;
  const key='route:'+color+':'+cat+':'+primary;
  if(!styleCache.has(key))styleCache.set(key,[new Style({zIndex:level,stroke:new Stroke({color:'#4a565a66',width:w+1.2,lineDash:cat==='ferry'?[7,5]:undefined})}),new Style({zIndex:level+.1,stroke:new Stroke({color,width:w,lineDash:cat==='ferry'?[7,5]:undefined})})]);
  return styleCache.get(key);
 }
 else if(roadKeys.includes(cat)&&!area&&!point){
  const h=p['map:road_class']||p.highway;z=10;
  if(h==='footway'||h==='pedestrian'){if(res>7)return null;line=cat==='paths'?'#817b59':'#b18b74';width=currentTheme==='transport'?2:1.2;dash=cat==='paths'?[3,3]:undefined;}
  else if(/motorway|trunk/.test(h)){line='#d4944c';width=res>12?2:3.5;z=12;}
  else if(/primary|secondary/.test(h)){line='#e0b873';width=res>12?1.2:2.5;}
  else{if(res>14)return null;line='#fffdf7';width=h==='service'?(res>4?.8:1.5):(res>4?1.2:2.4);}
  if(p.tunnel==='yes'){dash=[5,4];line='#999f9b';z=9;}
  if(p.bridge==='yes')z=14;
 }
 else if(cat==='rail'&&!area&&!point){line=fill;width=res>10?.8:1.5;dash=p.tunnel==='yes'?[3,4]:[6,2];z=8;}
 else if(cat==='contours'){line=fill;width=.7;z=1;}
 else if(utilityKeys.includes(cat)&&!area&&!point){line=fill;width=currentTheme==='utilities'?2.5:.8;z=currentTheme==='utilities'?18:3;}
 else if(point){if(cat==='trees'&&res>2)return null;const focused=currentTheme!=='explore'&&themes[currentTheme].focus.includes(cat);if(res>(focused?80:4)&&cat!=='stops')return null;z=20;}
 else if(area){if(res<3)line='#a7b7aa';}
 else{line=fill;}
 const emphasis=themeEmphasis(currentTheme,cat),focused=currentTheme!=='explore'&&themes[currentTheme].focus.includes(cat);
 if(focused&&area){line=fill;width=1.5;z=19;}
 fill=soften(fill,emphasis);line=soften(line,emphasis);
 fill=contextColor(currentTheme,cat,fill);if(line)line=contextColor(currentTheme,cat,line);
 if(neutralThemes.has(currentTheme)&&roadKeys.includes(cat)&&cat!=='paths'&&cat!=='pedestrianStreets')width*=.8;
 if(currentTheme==='utilities'&&!focused&&cat==='airports')fill='#dedfd9';
 const radius=focused?4:cat==='stops'?3:2;
 const key=[fill,line,width,z,dash,point,area,radius].join('|');
 if(!styleCache.has(key))styleCache.set(key,new Style({zIndex:z,fill:area?new Fill({color:fill}):undefined,stroke:line?new Stroke({color:line,width,lineDash:dash}):undefined,image:point?new Circle({radius,fill:new Fill({color:fill}),stroke:new Stroke({color:'#fffdf5',width:1})}):undefined}));
 return styleCache.get(key);
}
const base=new VectorImageLayer({source,style,imageRatio:1.4});
const labelLayer=new VectorLayer({source:labels,declutter:true,style:labelStyle});
const destinationSource=new VectorSource({wrapX:false});
const destinationLayer=new VectorLayer({source:destinationSource,declutter:true,zIndex:45,style:destinationStyle,renderOrder:(a,b)=>Number(b===selected)-Number(a===selected)||Number(themes[currentTheme].focus.includes(bucket.get(b)))-Number(themes[currentTheme].focus.includes(bucket.get(a)))||String(a.getId()).localeCompare(String(b.getId()))});
const routeLabelSource=new VectorSource({wrapX:false});
const routeLabelLayer=new VectorLayer({source:routeLabelSource,declutter:true,zIndex:40});
let transitRoutes=[];
const labelMeasure=document.createElement('canvas').getContext('2d');
labelMeasure.font='600 12px "Public Sans"';
function updateRouteLabels(){
 routeLabelSource.clear();
 const res=view.getResolution(),size=map.getSize();if(!ready||!size||inset)return;
 const policy=routeLabelPolicy(currentTheme,res);if(res>60&&!selected?.get('route'))return;
 routeLabelLayer.setZIndex(currentTheme==='transport'?40:30);labelLayer.setZIndex(currentTheme==='transport'?20:40);
 const mapRect=map.getViewport().getBoundingClientRect(),blocked=[];
 for(const selector of ['#panel','#info','#north','.ol-zoom','#camera-status']){
  const element=document.querySelector(selector);if(!element||!element.getClientRects().length)continue;
  const r=element.getBoundingClientRect();blocked.push([r.left-mapRect.left-8,r.top-mapRect.top-8,r.right-mapRect.left+8,r.bottom-mapRect.top+8]);
 }
 const available=transitRoutes.filter(r=>visible.has(r.category)).map(r=>({...r,title:policy.compact&&r.feature!==selected?routeBadge(r.feature.getProperties()):r.title,priority:r.feature===selected}));
 const candidates=placeRouteLabels(available,{project:c=>map.getPixelFromCoordinate(c),width:size[0],height:size[1],measure:s=>labelMeasure.measureText(s).width,blocked,...policy});
 for(const candidate of candidates){
  const r=candidate.route,f=new Feature(new Point(candidate.coordinate));f.set('routeFeature',r.feature);
  const color=routeColor(r.feature.getProperties(),routePalette);
  f.setStyle(new Style({text:new Text({text:r.title,font:'600 12px "Public Sans",sans-serif',rotation:candidate.rotation,fill:new Fill({color:'#27474b'}),stroke:new Stroke({color:'#fffdf5',width:2}),backgroundFill:new Fill({color:'#fffdf5eb'}),backgroundStroke:new Stroke({color,width:1}),padding:[3,5,3,5]})}));routeLabelSource.addFeature(f);
 }
}
const cameraSource=new VectorSource(),cameraFeature=new Feature(new Point([0,0])),aimFeature=new Feature(new Point([0,0])),footprintFeature=new Feature(new Polygon([])),sightFeature=new Feature(new LineString([]));
const markerShape=new Icon({src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="30" viewBox="0 0 26 30"><path d="M13 2L23 27L13 21L3 27Z" fill="#ec634a" stroke="#fff8e7" stroke-width="2" stroke-linejoin="round"/></svg>'),anchor:[.5,.5],scale:.85});
cameraFeature.setStyle(new Style({image:markerShape,zIndex:3}));
aimFeature.setStyle(new Style({image:new Circle({radius:5,fill:new Fill({color:'#fffdf5'}),stroke:new Stroke({color:'#ce553b',width:2})}),zIndex:2}));
footprintFeature.setStyle(new Style({fill:new Fill({color:'#ee9c4b20'}),stroke:new Stroke({color:'#d98235',width:2,lineDash:[7,4]}),zIndex:0}));
sightFeature.setStyle(new Style({stroke:new Stroke({color:'#ce553b',width:1.5,lineDash:[4,4]}),zIndex:1}));
const cameraLayer=new VectorLayer({source:cameraSource,zIndex:100});
let overlay=inset||mode==='stream',terrain=null;
const storedOverlay=new URLSearchParams(location.hash.slice(1)).get('camera');if(!__PUBLIC_VIEWER__&&storedOverlay!==null)overlay=storedOverlay==='1';
function updateOverlay(){cameraLayer.setVisible(overlay);$('#camera-overlay').setAttribute('aria-pressed',String(overlay));$('#camera-legend').hidden=!overlay;if(!overlay)setFollowing(false);saveHash();}
const selectionSource=new VectorSource(),selectionLayer=new VectorLayer({source:selectionSource,zIndex:44,style:new Style({stroke:new Stroke({color:'#126971',width:4}),fill:new Fill({color:'#e6be7144'}),image:new Circle({radius:9,stroke:new Stroke({color:'#126971',width:3}),fill:new Fill({color:'#e6be71'})})})});
const countyContext=createCountyContext();
countyContext.boundary.setVisible(new URLSearchParams(location.hash.slice(1)).get('boundary')!=='0');
const view=new View({center:[0,0],zoom:12,maxZoom:22,enableRotation:false});
const map=new Map({target:'map',controls:defaults({rotate:false}).extend([new ScaleLine()]),layers:[countyContext.ground,base,countyContext.boundary,labelLayer,routeLabelLayer,selectionLayer,destinationLayer,cameraLayer],view});
document.querySelector('.ol-zoom-in')?.setAttribute('aria-label','Zoom in');
document.querySelector('.ol-zoom-out')?.setAttribute('aria-label','Zoom out');
if(inset)map.getInteractions().clear();
function changed(){if(ready&&__PUBLIC_VIEWER__)loadOptionalLayers();countyContext.ground.setStyle(new Style({fill:new Fill({color:groundColor(currentTheme)})}));styleCache.clear();base.changed();labelLayer.changed();destinationLayer.changed();updateRouteLabels();rememberTheme();saveHash();}
function setFollowing(on){on=__PUBLIC_VIEWER__?false:on;following=on;if(on){overlay=true;cameraLayer.setVisible(true);$('#camera-overlay').setAttribute('aria-pressed','true');$('#camera-legend').hidden=false;}$('#follow').setAttribute('aria-pressed',String(on));$('#follow').textContent=on?'Following camera':'Follow camera';if(on&&lastCamera)applyCamera(lastCamera,0);saveHash();}
map.on('pointerdrag',()=>{if(!inset)setFollowing(false);});
map.getViewport().addEventListener('wheel',()=>{if(!inset)setFollowing(false);},{passive:true});
function compactPublic(){return __PUBLIC_VIEWER__&&map.getSize()[0]<=600;}
function fit(){if(compactPublic())document.body.classList.add('panel-closed');setFollowing(inset);if(all.length){const extent=createEmpty();for(const f of all)if(bucket.get(f)!=='contours'&&bucket.get(f)!=='trees')extend(extent,f.getGeometry().getExtent());view.fit(extent,{padding:inset?[25,25,25,25]:compactPublic()?[30,24,30,24]:[45,50,45,document.body.classList.contains('panel-closed')?50:370],duration:350});}}
function saveHash(){if(!ready||inset)return;const c=toLonLat(view.getCenter());const h=new URLSearchParams({x:c[0].toFixed(6),y:c[1].toFixed(6),z:view.getZoom().toFixed(2),layers:[...visible].join(','),theme:currentTheme,preset:DEFAULTS_VERSION,camera:overlay?'1':'0',boundary:countyContext.boundary.getVisible()?'1':'0',background:backgroundPlaces?'1':'0'});history.replaceState(null,'','#'+h);}
function restoreHash(){const h=new URLSearchParams(location.hash.slice(1));const x=Number(h.get('x')),y=Number(h.get('y')),z=Number(h.get('z'));if(h.has('x')&&h.has('y')&&h.has('z')&&[x,y,z].every(Number.isFinite)&&Math.abs(x)<180&&Math.abs(y)<85&&z>=1&&z<=22){view.setCenter(fromLonLat([x,y]));view.setZoom(z);return true;}return false;}
let hashTimer;map.on('moveend',()=>{clearTimeout(hashTimer);hashTimer=setTimeout(saveHash,350);if(ready&&!inset){renderLayers();updateRouteLabels();if(__PUBLIC_VIEWER__)loadOptionalLayers();}});
map.on('change:size',()=>{if(ready)updateRouteLabels();});
function renderLayers(){
 renderThemeBar(currentTheme,setTheme);
 renderThemePanel({theme:currentTheme,visible,counts,routeColors,routeKeyItems:transitRoutes.filter(r=>visible.has(r.category)).map(r=>({title:r.feature.get('name')||r.title,color:routeColor(r.feature.getProperties(),routePalette)})),resolution:view.getResolution(),backgroundPlaces,onBackground:on=>{backgroundPlaces=on;try{localStorage.setItem('tropicana-background-places-v1',on?'1':'0');}catch{}if(selected&&!featureAvailable(selected,view.getResolution())){selectionSource.clear();selected=null;$('#info').hidden=true;}renderLayers();changed();},boundary:countyContext.boundary.getVisible(),onBoundary:on=>{countyContext.boundary.setVisible(on);saveHash();},onChange:setLayers,onReset:()=>{visible.clear();for(const k of defaultLayers(currentTheme))visible.add(k);selectionSource.clear();$('#info').hidden=true;selected=null;renderLayers();changed();}});
}
function showInfo(f){
 selected=f;selectionSource.clear();selectionSource.addFeature(f);$('#info').hidden=false;
 const p=f.getProperties(),cat=bucket.get(f);$('#info-name').textContent=p.name||categories[cat][1];$('#info-category').textContent=categories[cat][0]+' / '+categories[cat][1];const symbol=destinationSymbol(cat,p);if(symbol){const icon=document.createElement('span');icon.className='material-symbols-rounded detail-symbol';icon.setAttribute('aria-hidden','true');icon.textContent=symbol;$('#info-category').prepend(icon);}
 $('#info-note').textContent=cat==='air'?'Exporter labels this as subway; classified as air from its name. Geometry may be missing.':f.getGeometry().getType().includes('Polygon')&&p.natural!=='water'?'Exported lot or area; not a surveyed building footprint.':cat==='places'?'District label position; district boundaries were not exported.':p.route?'Exported route geometry; service frequency and live vehicles are not included.':'';
 if(cat==='stops'&&symbol==='metro')$('#info-note').textContent='Transit station or stop; mode unspecified in the export. M is the atlas marker, not a verified metro classification.';
 if(p['map:area_class']==='fishing')$('#info-note').textContent='Reviewed fishing area. Original export labels this as farmland; the water underneath is preserved.';
 if(p['map:road_class'])$('#info-note').textContent='Map display: '+(p['map:road_class']==='service'?'access / alley':'local street')+'. Original export: '+p.highway+'.';
 $('#info-tags').replaceChildren();for(const [k,v]of Object.entries(p)){if(['geometry','timestamp','version','id'].includes(k))continue;const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=String(v);$('#info-tags').append(dt,dd);}
 destinationLayer.changed();labelLayer.changed();updateRouteLabels();
}
map.on('singleclick',e=>{if(inset)return;let found;map.forEachFeatureAtPixel(e.pixel,(f,l)=>{if(l===routeLabelLayer){found=f.get('routeFeature');return true;}if(l!==base&&l!==labelLayer&&l!==destinationLayer)return;if(featureAvailable(f,view.getResolution())){found=f;return true;}},{hitTolerance:5});if(found)showInfo(found);});
$('#close-info').onclick=()=>{$('#info').hidden=true;selectionSource.clear();selected=null;destinationLayer.changed();labelLayer.changed();updateRouteLabels();};
$('#search').addEventListener('input',()=>{
 const q=$('#search').value.trim().toLowerCase();$('#results').replaceChildren();if(q.length<2)return;
 const matches=[...named.entries()].filter(([name])=>name.toLowerCase().includes(q)).sort((a,b)=>{const rank=e=>Number(e[0].toLowerCase()===q)*100+Number(e[1].some(f=>f.get('place')))*20+Number(e[0].toLowerCase().startsWith(q))*10;return rank(b)-rank(a)||a[0].localeCompare(b[0]);}).slice(0,12);
 for(const [name,features]of matches){const b=document.createElement('button');b.textContent=name;b.onclick=()=>{if(compactPublic())document.body.classList.add('panel-closed');setFollowing(false);const extent=createEmpty();for(const f of features){extend(extent,f.getGeometry().getExtent());visible.add(bucket.get(f));}renderLayers();changed();view.fit(extent,{padding:compactPublic()?[30,24,Math.min(260,map.getSize()[1]*.45),24]:[60,390,60,370],maxZoom:17,duration:450});showInfo(features[0]);};$('#results').append(b);}
 if(!matches.length){const p=document.createElement('p');p.textContent='No matching exported name';$('#results').append(p);}
});
let lastCamera=null,lastArrival=0,lastAge=Infinity,displayCamera=null,animation=null,lastSample=null;
function applyCamera(data,duration=480){
 if(!data.camera)return;
 const stamp=JSON.stringify(data.camera);if(stamp===lastSample&&duration)return;lastSample=stamp;
 animation={start:performance.now(),duration,from:displayCamera||data.camera,to:data.camera,north:data.north};
}
function lerpCamera(a,b,t){
 const c={pivot:{},position:{},angle:{},zoom:a.zoom+(b.zoom-a.zoom)*t};
 for(const section of ['pivot','position'])for(const key of ['x','y','z'])c[section][key]=a[section][key]+(b[section][key]-a[section][key])*t;
 const delta=((b.angle.x-a.angle.x+540)%360)-180;c.angle.x=a.angle.x+delta*t;c.angle.y=a.angle.y+(b.angle.y-a.angle.y)*t;return c;
}
function drawCamera(c,north){
 const p=projectCamera(c,terrain),toMap=q=>fromLonLat(gameToLonLat(q[0],q[1],north));
 const eye=toMap(p.eye),aim=p.aim?toMap(p.aim):null,ring=p.polygon.map(toMap);
 cameraFeature.getGeometry().setCoordinates(eye);
 const ahead=toMap([p.eye[0]+Math.sin(p.heading)*10,p.eye[1]+Math.cos(p.heading)*10]);markerShape.setRotation(Math.atan2(ahead[0]-eye[0],ahead[1]-eye[1]));cameraFeature.changed();
 aimFeature.getGeometry().setCoordinates(aim||eye);
 // A missing ground intersection is not substituted with the controller pivot.
 footprintFeature.getGeometry().setCoordinates(ring.length?[[...ring,ring[0]]]:[]);sightFeature.getGeometry().setCoordinates(aim?[eye,aim]:[]);
 const wanted=[cameraFeature,footprintFeature,sightFeature,...(aim?[aimFeature]:[])];
 for(const f of wanted)if(!cameraSource.hasFeature(f))cameraSource.addFeature(f);
 if(!aim&&cameraSource.hasFeature(aimFeature))cameraSource.removeFeature(aimFeature);
 if(following){
  if(inset){const extent=createEmpty();for(const q of [...ring,eye])extend(extent,[...q,...q]);const size=map.getSize();const resolution=Math.max(1500/size[0],(extent[2]-extent[0])/Math.max(50,size[0]-64),(extent[3]-extent[1])/Math.max(50,size[1]-96));view.setResolution(resolution);const center=getCenter(extent);center[1]+=resolution*12;view.setCenter(center);}
  else view.setCenter(aim||(ring.length?getCenter(footprintFeature.getGeometry().getExtent()):eye));
 }
}
function animate(now){if(animation){const t=animation.duration?Math.min(1,(now-animation.start)/animation.duration):1;displayCamera=lerpCamera(animation.from,animation.to,t);drawCamera(displayCamera,animation.north);if(t===1)animation=null;}requestAnimationFrame(animate);}
if(!__PUBLIC_VIEWER__)requestAnimationFrame(animate);
async function poll(){
 try{const r=await fetch('/api/camera',{cache:'no-store',signal:AbortSignal.timeout(1800)});if(!r.ok)throw new Error('Offline');const data=await r.json();lastArrival=performance.now();lastAge=data.ageMs??Infinity;if(data.camera&&lastAge<=3000){lastCamera=data;applyCamera(data);} }
 catch{/* Age continues from the last successful sample, including server failure. */}
 finally{setTimeout(poll,500);}
}
if(!__PUBLIC_VIEWER__)setInterval(()=>{const age=lastAge+(performance.now()-lastArrival),state=ageState(age);$('#camera-status').textContent=state==='live'?(following?'Following game camera':'Live camera · browse freely'):'Camera unavailable · map retained';if(state==='hidden'){cameraSource.clear();lastSample=null;}},250);
async function load(initial=false){
 $('#reload').disabled=true;$('#status').textContent=__PUBLIC_VIEWER__?'Loading map…':'Loading local export…';
 try{
 let response,data;
 if(__PUBLIC_VIEWER__){
  snapshotManifest=await readJson(await fetch(assetUrl('data/manifest.json'),{cache:'no-cache'}));
  const publication=await readJson(await fetch(assetUrl('data/publication.json'),{cache:'no-cache'}));
  $('#publication-status').textContent=publicationLabel(publication.publishedAt);
  snapshotLayers=lazySnapshotLoader(snapshotManifest,async file=>readJson(await fetch(assetUrl(file))));
  data=await snapshotLayers.load('core');
 }else{response=await fetch('/data/map.geojson',{cache:'no-store'});if(!response.ok)throw new Error('The export is unavailable or still being written.');data=await response.json();}
 const features=new GeoJSON().readFeatures(data);
 const [rules,ground,areaRules]=await Promise.all([fetch(assetUrl('road-overrides.json'),{cache:'no-store'}).then(r=>r.json()),__PUBLIC_VIEWER__?Promise.resolve(null):fetch('/api/terrain',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),fetch(assetUrl('area-overrides.json'),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Area display rules unavailable');return r.json();})]);terrain=ground;
 const corrections=applyRoadOverrides(features,rules),areaCorrections=applyAreaOverrides(features,areaRules);const areaReview=areaCorrections.unmatched.length+areaCorrections.ambiguous.length;$('#area-status').textContent=`${areaCorrections.applied.length} reviewed fishing areas separated${areaReview?' · '+areaReview+' need review':''}`;for(const f of features)f.getGeometry().transform('EPSG:4326','EPSG:3857');
 const review=corrections.unmatched.length+corrections.ambiguous.length;$('#road-status').textContent=`${corrections.speedRuleApplied.length} speed-rule matches � ${corrections.applied.length} reviewed segment matches${review?' · '+review+' need review':''}`;if(!features.length)throw new Error('No map features');
 all=features;bucket.clear();named.clear();for(const f of all){bucket.set(f,classifyThemed(f.getProperties()));const name=f.get('name');if(name){if(!named.has(name))named.set(name,[]);named.get(name).push(f);}}
 routePalette=buildRouteColors(all);
 counts.clear();routeColors.clear();for(const f of all){const k=bucket.get(f);counts.set(k,(counts.get(k)||0)+1);if(f.get('route')||f.get('osm_export_route')){if(!routeColors.has(k))routeColors.set(k,new Set());routeColors.get(k).add(routeColor(f.getProperties(),routePalette));}}
 if(__PUBLIC_VIEWER__)for(const key of ['trees','contours'])counts.set(key,snapshotManifest.counts[key]||0);
 transitRoutes=collectRoutes(all,classifyThemed);
 destinationSource.clear();destinationSource.addFeatures(all.filter(f=>destinationSymbol(bucket.get(f),f.getProperties())&&['Point','Polygon','MultiPolygon'].includes(f.getGeometry().getType())));
 source.clear();labels.clear();source.addFeatures(all.filter(f=>bucket.get(f)!=='places'));labels.addFeatures(all.filter(f=>f.get('name')&&!f.get('route')&&!f.get('osm_export_route')));
 if(initial&&!inset){const h=new URLSearchParams(location.hash.slice(1));if(!legacyCommunity&&h.has('layers')&&h.get('preset')===DEFAULTS_VERSION){visible.clear();for(const k of normalizeLayers(h.get('layers').split(','),!h.has('theme')))visible.add(k);}}
 renderLayers();$('#status').textContent=`Map exported ${__PUBLIC_VIEWER__?formatSnapshotDate(snapshotManifest.exportedAt):response.headers.get('X-Export-Date')||''}`;$('#feature-total').textContent=(snapshotManifest?.features??all.length).toLocaleString()+' exported features';
 if(initial){if(inset){fit();}else if(!restoreHash())fit();}ready=true;changed();
 if(lastCamera)applyCamera(lastCamera,0);
 }catch(e){$('#status').textContent=e.message;$('#camera-status').textContent='Map unavailable · reload export';console.error(e);}finally{$('#reload').disabled=false;}
}
async function loadOptionalLayers(){
 if(!snapshotLayers)return;
 for(const key of ['contours','trees']){
  if(!visible.has(key)||(key==='trees'&&view.getResolution()>2)||snapshotLayers.loaded.has(key)||extraLoads.has(key))continue;
  extraLoads.add(key);$('#optional-status').textContent='Loading '+categories[key][1].toLowerCase()+'…';
  try{
   const data=await snapshotLayers.load(key);if(!data)continue;
   const added=new GeoJSON().readFeatures(data,{featureProjection:'EPSG:3857'});
   for(const f of added){const cat=classifyThemed(f.getProperties());bucket.set(f,cat);all.push(f);const name=f.get('name');if(name){if(!named.has(name))named.set(name,[]);named.get(name).push(f);}}
   source.addFeatures(added);labels.addFeatures(added.filter(f=>f.get('name')));base.changed();labelLayer.changed();
   $('#optional-status').textContent=categories[key][1]+' loaded';
  }catch(error){
   const status=$('#optional-status');status.replaceChildren(document.createTextNode(categories[key][1]+' could not load. '));
   const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=()=>loadOptionalLayers();status.append(retry);console.error(error);
  }finally{extraLoads.delete(key);}
 }
}
$('#fit').onclick=fit;$('#reload').onclick=()=>load();$('#follow').onclick=()=>setFollowing(!following);$('#layers-toggle').onclick=()=>{document.body.classList.toggle('panel-closed');updateRouteLabels();};
$('#camera-overlay').onclick=()=>{overlay=!overlay;updateOverlay();};updateOverlay();load(true);if(!__PUBLIC_VIEWER__)poll();


Promise.all([document.fonts.load('400 12px "Public Sans"'),document.fonts.load('600 13px "Public Sans"')]).then(()=>{base.changed();labelLayer.changed();if(ready)updateRouteLabels();countyContext.boundary.changed();});

Promise.all([document.fonts.load('400 22px "Material Symbols Rounded"'),document.fonts.ready]).then(()=>{symbolFontReady=true;destinationLayer.changed();labelLayer.changed();});
