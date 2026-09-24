import {fixture} from './test-fixture.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import GeoJSON from 'ol/format/GeoJSON.js';
import {themes,defaultLayers,gettingAroundThemes,classifyThemed} from './themes.js';
import {contextColor,groundColor,routeKey,routeColor,buildRouteColors,routeBadge,routeLabelPolicy,fallbackRouteColor} from './map-presentation.js';
import {collectRoutes,placeRouteLabels} from './transit-labels.js';
const data=fixture();data.features=data.features.filter(f=>f.properties.route||f.properties.osm_export_route);
const features=new GeoJSON().readFeatures(data,{featureProjection:'EPSG:3857'}),colors=buildRouteColors(features),routes=collectRoutes(features,classifyThemed);
const metros=routes.filter(r=>r.category==='subway');assert.equal(metros.length,5);
assert.equal(new Set(metros.map(r=>routeColor(r.feature.getProperties(),colors))).size,5);
const coast=metros.find(r=>r.feature.get('name')==='East Coast Line (ECL)');assert.equal(routeColor(coast.feature.getProperties(),colors),'#EE00FF');
assert.equal(routeBadge(coast.feature.getProperties()),'ECL');
assert.equal(routeKey({route:'subway',ref:'5',name:'new name'}),routeKey(coast.feature.getProperties()));
assert.equal(fallbackRouteColor('ferry:7'),fallbackRouteColor('ferry:7'));
for(const t of Object.keys(themes))assert.ok(t==='transport'||gettingAroundThemes.has(t),'Every theme exposes networks');
for(const t of ['utilities','education','healthcare','civic','leisure','land']){for(const k of ['bus','subway','train','ferry','parking','paths'])assert.ok(!defaultLayers(t).has(k),t+' optional '+k);assert.ok(defaultLayers(t).has('pedestrianStreets'));}
for(const t of ['transport','utilities','education','healthcare','civic','leisure','land'])assert.equal(contextColor(t,'highways','#d4944c'),'#929895');
for(const t of ['roads','explore'])assert.equal(contextColor(t,'highways','#d4944c'),'#d4944c');
assert.notEqual(groundColor('utilities'),groundColor('explore'));
const args={project:c=>[800+c[0]/10,800-c[1]/10],width:1600,height:1600};
for(const t of Object.keys(themes)){
 const p=routeLabelPolicy(t,14);assert.ok(p.compact);assert.ok(p.maxTotal<=5);assert.equal(p.maxPerRoute,1);
 const placed=placeRouteLabels(routes,{...args,...p});assert.ok(placed.length<=p.maxTotal);
 assert.ok(routeLabelPolicy(t,2).maxTotal>=p.maxTotal);
}
const selected=routes.find(r=>r===coast);const priority=routes.map(r=>({...r,priority:r===selected}));
assert.equal(placeRouteLabels(priority,{...args,maxTotal:1})[0].route.id,selected.id);
console.log('All-theme overlays, exported route-color inheritance, stable fallback, neutral backgrounds, total label budgets and selected-route priority passed.');
