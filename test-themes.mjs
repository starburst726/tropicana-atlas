import assert from 'node:assert/strict';
import {themes,categories,classifyThemed,normalizeLayers,defaultLayers,themeEmphasis,detailVisible} from './themes.js';
for(const [props,want] of [[{power:'plant',landuse:'industrial'},'powerPlants'],[{power:'line'},'powerLines'],[{power:'substation'},'substations'],[{amenity:'school'},'schools'],[{amenity:'hospital'},'healthcare'],[{amenity:'fire_station'},'fire'],[{amenity:'police'},'police'],[{amenity:'post_office'},'postal'],[{route:'subway',name:'Air line 1'},'air'],[{highway:'secondary_link','map:road_class':'residential'},'localRoads']])assert.equal(classifyThemed(props),want);
assert.ok(normalizeLayers(['services'],true).has('schools'));
assert.ok(!normalizeLayers(['services'],false).has('schools'),'New filter selections must not re-enable unchecked schools');
for(const [id,t] of Object.entries(themes)){
 for(const k of [...t.defaults,...t.focus,...t.legend,...t.groups.flatMap(g=>g[1])])assert.ok(categories[k],id+': '+k);
 for(const k of ['localRoads','water','places'])assert.ok(defaultLayers(id).has(k));
}
assert.ok(defaultLayers('explore').has('residential'));
assert.ok(!defaultLayers('explore').has('powerLines'));
assert.ok(defaultLayers('utilities').has('powerLines'));
assert.equal(themeEmphasis('utilities','powerLines'),1);
assert.ok(themeEmphasis('utilities','residential')<themeEmphasis('utilities','roads'));
console.log('Theme classification, old-link migration, filter fidelity and context defaults passed.');

assert.equal(classifyThemed({amenity:'pharmacy'}),'pharmacies');
assert.equal(classifyThemed({landuse:'farmland','map:area_class':'fishing'}),'fishing');
for(const [id,t] of Object.entries(themes)){
 assert.ok(!defaultLayers(id).has('fishing'),id+' fishing off');
 assert.equal(themeEmphasis(id,'water'),1);
 const keys=t.groups.flatMap(g=>g[1]);assert.equal(new Set(keys).size,keys.length,id+' unique controls');
}
for(const k of ['bus','parking'])assert.ok(!defaultLayers('transport').has(k));
for(const k of ['subway','train','ferry'])assert.ok(defaultLayers('transport').has(k));
assert.ok(defaultLayers('education').has('schools'));
assert.ok(defaultLayers('healthcare').has('healthcare'));
assert.ok(!defaultLayers('healthcare').has('pharmacies'));
for(const k of ['fire','police','postal'])assert.ok(defaultLayers('civic').has(k));
assert.deepEqual(Object.keys(themes),['explore','roads','transport','education','healthcare','civic','leisure','utilities','land']);
for(const k of ['food','entertainment'])assert.ok(!defaultLayers('leisure').has(k));
for(const t of ['utilities','education','healthcare','civic','transport','leisure'])assert.ok(!defaultLayers(t).has('residential'));
assert.equal(detailVisible('transport','stops',{highway:'bus_stop'},16),false);
assert.equal(detailVisible('transport','stops',{highway:'bus_stop'},3),true);
assert.equal(detailVisible('transport','stops',{railway:'station'},16),true);
assert.equal(detailVisible('explore','pharmacies',{},16),false);
assert.equal(detailVisible('explore','pharmacies',{},3),true);
console.log('Reviewed defaults, category separation, water styling and zoom detail passed.');

assert.equal(classifyThemed({amenity:'pharmacy',shop:'yes',landuse:'commercial'}),'pharmacies');

assert.equal(detailVisible('transport','localRoads',{highway:'mini_roundabout'},16),false);
assert.equal(detailVisible('transport','localRoads',{highway:'mini_roundabout'},3),true);

for(const [highway,want] of [['motorway_link','highways'],['trunk','highways'],['secondary','majorRoads'],['service','localRoads'],['footway','paths'],['pedestrian','pedestrianStreets']])assert.equal(classifyThemed({highway}),want);
assert.equal(classifyThemed({highway:'secondary_link','map:road_class':'residential'}),'localRoads');
assert.ok(defaultLayers('roads').has('parking'));
for(const t of ['roads','transport','explore'])assert.ok(defaultLayers(t).has('pedestrianStreets'));
assert.equal(detailVisible('roads','parking',{},16),false);assert.equal(detailVisible('roads','parking',{},3),true);
assert.equal(detailVisible('transport','paths',{},16),false);assert.equal(detailVisible('transport','paths',{},3),true);
assert.ok(normalizeLayers(['roads'],true).has('paths'));
console.log('Road grouping, shared pedestrian streets, parking and paths zoom rules passed.');

assert.ok(!normalizeLayers(['roads','highways']).has('localRoads'),'Current saved filters must not re-enable unchecked road groups');
