import {formatSnapshotDate,publicationLabel} from './snapshot-dates.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import GeoJSON from 'ol/format/GeoJSON.js';
import {readJson,lazySnapshotLoader} from './snapshot-loader.js';
import {classifyThemed} from './themes.js';
import {applyRoadOverrides} from './road-overrides.js';
import {applyAreaOverrides} from './area-overrides.js';
const manifest=JSON.parse(fs.readFileSync('snapshot/data/manifest.json'));
const features=[],core=[];
for(const [key,entry] of Object.entries(manifest.layers)){
 const bytes=fs.readFileSync('snapshot/'+entry.file);
 assert.equal(bytes.length,entry.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
 const data=await readJson(new Response(bytes));
 assert.deepEqual(data,JSON.parse(gunzipSync(bytes)));assert.equal(data.features.length,entry.features);
 assert.deepEqual(await readJson(new Response(JSON.stringify(data))),data);
 for(const f of data.features){const category=classifyThemed(f.properties);assert.equal(category==='trees'||category==='contours'?category:'core',key);features.push(f);if(key==='core')core.push(f);}
}
assert.equal(features.length,manifest.features);
// Lossless comparison when the private original conversion is present.
if(fs.existsSync('cache/map.geojson')){
 const bytes=fs.readFileSync('cache/map.geojson');
 if(createHash('sha256').update(bytes).digest('hex')===manifest.sourceSha256){
  const original=JSON.parse(bytes).features,byId=new Map(features.map(f=>[f.id,f]));
  assert.equal(byId.size,original.length);
  for(const f of original)assert.deepEqual(byId.get(f.id),f);
  console.log('Every feature, original tag and coordinate round-trips exactly.');
 }
}
const ol=new GeoJSON().readFeatures({type:'FeatureCollection',features:core});
const roads=applyRoadOverrides(ol,JSON.parse(fs.readFileSync('public/road-overrides.json')));
const areas=applyAreaOverrides(ol,JSON.parse(fs.readFileSync('public/area-overrides.json')));
assert.equal(roads.applied.length,9);assert.equal(areas.applied.length,3);
assert.deepEqual([...roads.unmatched,...roads.ambiguous,...areas.unmatched,...areas.ambiguous],[]);
let calls=0;
const loader=lazySnapshotLoader(manifest,async()=>{calls++;return {features:[]};});
await Promise.all([loader.load('trees'),loader.load('trees')]);assert.equal(calls,1);
assert.equal(await loader.load('trees'),null);assert.equal(calls,1);
let attempts=0;
const retry=lazySnapshotLoader(manifest,async()=>{if(++attempts===1)throw Error('offline');return {};});
await assert.rejects(retry.load('contours'));assert.equal(retry.loaded.has('contours'),false);
await retry.load('contours');assert.equal(retry.loaded.has('contours'),true);
await assert.rejects(readJson(new Response('',{status:404})));
assert.ok(manifest.layers.core.bytes<manifest.sourceBytes*.1);
console.log('Public snapshot checks passed: lossless gzip, deferred groups, corrections, concurrent loads, retry and >90% initial map reduction.');

assert.equal(publicationLabel(null),'Website not published · Local preview');
assert.equal(formatSnapshotDate(null),'Date unavailable');
assert.match(publicationLabel('2026-09-24T18:00:00Z'),/^Published /);
