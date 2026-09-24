import assert from 'node:assert/strict';
import {classify,gameToLonLat,cameraHeading,ageState} from './classify.js';
assert.equal(classify({route:'subway',name:'Air line 1'}),'air');
assert.equal(classify({route:'subway',name:'Island metro'}),'subway');
assert.equal(classify({landuse:'industrial',industrial:'warehouse'}),'logistics');
assert.equal(classify({landuse:'industrial',industrial:'factory'}),'manufacturing');
assert.equal(classify({office:'it'}),'offices');
assert.equal(classify({amenity:'arts_centre'}),'entertainment');
assert.equal(classify({landuse:'residential'}),'residential');
assert.deepEqual(gameToLonLat(1110,2220),[.01,.02]);
assert.deepEqual(gameToLonLat(1110,2220,'East'),[-.02,.01]);
assert.equal(cameraHeading({position:{x:0,z:0},pivot:{x:0,z:1}}),0);
assert.equal(cameraHeading({position:{x:0,z:0},pivot:{x:1,z:0}}),Math.PI/2);
assert.equal(ageState(2999),'live'); assert.equal(ageState(3001),'stale'); assert.equal(ageState(10001),'hidden');
console.log('Classification, coordinate orientation, heading and stale thresholds passed.');

// Display-rule boundaries: retain raw tags and never reclassify pedestrian roads.
const {default:GeoJSON}=await import('ol/format/GeoJSON.js');
const {applyRoadOverrides}=await import('./road-overrides.js');
const base={highway:'motorway_link',maxspeed:'30',lanes:'1',oneway:'yes'};
const make=(properties={},type='LineString')=>new GeoJSON().readFeature({type:'Feature',properties:{...base,...properties},geometry:type==='Point'?{type,coordinates:[0,0]}:{type,coordinates:[[0,0],[.001,0]]}});
for(const highway of ['motorway_link','trunk_link','primary_link','secondary_link','tertiary_link']){
 const f=make({highway});applyRoadOverrides([f],[]);assert.equal(f.get('map:road_class'),'service');assert.equal(f.get('highway'),highway);assert.equal(f.get('map:original_highway'),highway);
}
for(const props of [{maxspeed:'40'},{maxspeed:undefined},{maxspeed:'30 mph'},{lanes:'2'},{oneway:'no'},{oneway:undefined},{highway:'pedestrian'},{highway:'residential'},{highway:'service'},{highway:'motorway'}]){
 const f=make(props);applyRoadOverrides([f],[]);assert.equal(f.get('map:road_class'),undefined);
}
const point=make({},'Point');applyRoadOverrides([point],[]);assert.equal(point.get('map:road_class'),undefined);
const specific=make({name:'Reviewed street'});applyRoadOverrides([specific],[{id:'review',name:'Reviewed street',original:'motorway_link',display:'residential',start:[0,0],end:[.001,0],toleranceMetres:1,reason:'Specific reviewed exception'}]);assert.equal(specific.get('map:road_class'),'residential');
console.log('Tropicana speed rule preserves raw tags, excludes nonmatches, and respects reviewed exceptions.');
