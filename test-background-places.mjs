import assert from 'node:assert/strict';
import {themes} from './themes.js';
import {isBackgroundPlace,backgroundPlaceOpacity,backgroundPlaceColor} from './background-places.js';
for(const [id,t]of Object.entries(themes)){
 for(const c of t.focus)assert.equal(isBackgroundPlace(c,t),false,id+' unchecked subject must stay hidden');
 for(const c of ['residential','manufacturing','retail','powerLines','pharmacies'])assert.equal(isBackgroundPlace(c,t),false,id+' no background clutter');
}
assert.ok(isBackgroundPlace('schools',themes.healthcare));assert.ok(isBackgroundPlace('parks',themes.healthcare));
assert.equal(isBackgroundPlace('schools',themes.education),false);assert.equal(isBackgroundPlace('healthcare',themes.healthcare),false);
assert.equal(backgroundPlaceOpacity(400,10),0);assert.ok(backgroundPlaceOpacity(400,2)>0);assert.equal(backgroundPlaceOpacity(100000,10),.26);
assert.ok(backgroundPlaceOpacity(400,4)<backgroundPlaceOpacity(400,2));
assert.equal(backgroundPlaceColor('#528baa',.26),'rgba(82,139,170,0.260)');
console.log('Background area scope, hidden-subject protection, small-lot fade and category colors passed.');
