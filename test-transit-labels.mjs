import {fixture} from './test-fixture.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import GeoJSON from 'ol/format/GeoJSON.js';
import {classifyThemed} from './themes.js';
import {roadMarkerAppearance} from './road-markers.js';
import {collectRoutes,placeRouteLabels,compactRouteName} from './transit-labels.js';
const source=fixture();
source.features=source.features.filter(f=>f.properties.route||f.properties.osm_export_route);
const features=new GeoJSON().readFeatures(source,{featureProjection:'EPSG:3857'});
const routes=collectRoutes(features,classifyThemed);
assert.equal(routes.filter(r=>r.category==='subway').length,5);
assert.equal(compactRouteName('East Coast Line (ECL)'),'East Coast \u00b7 ECL');
assert.equal(compactRouteName('',7),'Route 7');assert.equal(compactRouteName('',null),'');
const options={project:c=>[800+c[0]/10,800-c[1]/10],width:1600,height:1600};
const placements=placeRouteLabels(routes.filter(r=>r.category==='subway'),options);
assert.equal(new Set(placements.map(p=>p.route.id)).size,5,'All five metro routes receive labels at county scale');
for(const r of routes){assert.ok(placements.filter(p=>p.route.id===r.id).length<=3);}
for(let i=0;i<placements.length;i++)for(let j=i+1;j<placements.length;j++){
 const a=placements[i],b=placements[j];assert.ok(!(a.box[0]<b.box[2]&&a.box[2]>b.box[0]&&a.box[1]<b.box[3]&&a.box[3]>b.box[1]),'No label overlap');
 if(a.route.id===b.route.id)assert.ok(Math.hypot(a.pixel[0]-b.pixel[0],a.pixel[1]-b.pixel[1])>=420);
}
assert.deepEqual(placements.map(p=>[p.route.id,p.coordinate]),placeRouteLabels([...routes.filter(r=>r.category==='subway')].reverse(),options).map(p=>[p.route.id,p.coordinate]),'Order-independent deterministic placement');
const make=(id,parts)=>({id,title:id,parts});
const gap=make('gap',[[[50,250],[180,250]],[[600,250],[750,250]]]);
const basic={project:c=>c,width:800,height:500,maxPerRoute:3};
const g=placeRouteLabels([gap],basic);assert.ok(g.length);assert.ok(g.every(p=>p.pixel[0]<=180||p.pixel[0]>=600),'Never bridge unexported gaps');
assert.equal(placeRouteLabels([gap],{...basic,blocked:[[0,0,800,500]]}).length,0);
const shared=placeRouteLabels([make('A',[[[40,200],[760,200]]]),make('B',[[[40,200],[760,200]]])],basic);assert.equal(new Set(shared.map(p=>p.route.id)).size,2,'Shared tracks retain both route identities');
assert.equal(placeRouteLabels([make('offscreen',[[[900,900],[1000,1000]]])],basic).length,0);
assert.ok(placeRouteLabels([make('long',[[[-1e9,250],[1e9,250]]])],basic).length,'Long offscreen segments clipped efficiently');
assert.equal(roadMarkerAppearance(6),null);assert.equal(roadMarkerAppearance(20),null);
assert.ok(roadMarkerAppearance(5).alpha<roadMarkerAppearance(3).alpha);
assert.ok(roadMarkerAppearance(3).alpha<roadMarkerAppearance(1).alpha);
assert.ok(roadMarkerAppearance(.01).radius<=2);
console.log('Route label fairness, spacing, overlap, identity, clipping, gaps, deterministic updates and road-marker fade passed.');
console.log('County metro labels:',Object.fromEntries(routes.filter(r=>r.category==='subway').map(r=>[r.title,placements.filter(p=>p.route.id===r.id).length])));
