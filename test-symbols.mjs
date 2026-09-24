import assert from 'node:assert/strict';
import Polygon from 'ol/geom/Polygon.js';import MultiPolygon from 'ol/geom/MultiPolygon.js';import LineString from 'ol/geom/LineString.js';
import {destinationSymbol,symbolVisible,destinationAnchor} from './destination-symbols.js';
assert.equal(destinationSymbol('stops',{railway:'station'}),'metro');
assert.equal(destinationSymbol('stops',{highway:'bus_stop'}),'directions_bus');
assert.equal(destinationSymbol('police',{amenity:'prison'}),'lock');
assert.equal(destinationSymbol('localRoads',{highway:'turning_circle'}),null);
assert.equal(destinationSymbol('residential'),null);
assert.equal(symbolVisible('schools',{},20,true),false);assert.equal(symbolVisible('schools',{},8,true),true);assert.equal(symbolVisible('schools',{},8,false),false);
assert.equal(symbolVisible('stops',{highway:'bus_stop'},5,true),false);assert.equal(symbolVisible('stops',{railway:'station'},5,true),true);
assert.equal(symbolVisible('schools',{},20,true,true),true);
const concave=new Polygon([[[0,0],[10,0],[10,2],[2,2],[2,10],[0,10],[0,0]]]);assert.ok(concave.intersectsCoordinate(destinationAnchor(concave).getCoordinates()));
const big=new Polygon([[[20,20],[40,20],[40,40],[20,40],[20,20]]]);const multi=new MultiPolygon([concave.getCoordinates(),big.getCoordinates()]);assert.ok(big.intersectsCoordinate(destinationAnchor(multi).getCoordinates()));
assert.equal(destinationAnchor(new LineString([[0,0],[1,1]])),null);
console.log('Symbol semantics, scale limits, selected priority eligibility and interior anchors passed.');

import {themeAllowsSymbol,categorySymbols} from './destination-symbols.js';
import {themes,defaultLayers} from './themes.js';
const expected={explore:['schools','healthcare','pharmacies','fire','police','postal','parks','food','entertainment','airports'],roads:['parking'],transport:['stops','airports'],education:['schools'],healthcare:['healthcare'],civic:['fire','police','postal'],leisure:['parks'],utilities:['powerPlants','substations','utilities'],land:['food','entertainment']};
for(const [theme,spec]of Object.entries(themes)){
 const eligible=Object.keys(categorySymbols).filter(c=>defaultLayers(theme).has(c)&&themeAllowsSymbol(theme,c,spec.focus));
 assert.deepEqual(eligible.sort(),expected[theme].sort(),theme+' default icon eligibility');
 assert.equal(themeAllowsSymbol(theme,'parks',spec.focus),['explore','leisure'].includes(theme));
 assert.equal(themeAllowsSymbol(theme,'airports',spec.focus),['explore','transport'].includes(theme));
 for(const c of ['stops','parking'])assert.ok(themeAllowsSymbol(theme,c,spec.focus),theme+' optional network icon');
 assert.ok(themeAllowsSymbol(theme,'parks',spec.focus,true),theme+' selected-place exception');
}
console.log('All nine themes: subject icons, optional networks and selected-place exceptions passed.');
