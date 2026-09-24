import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {classifyThemed} from './themes.js';
// Input must be a completed conversion. Originals are never opened for writing.
const [input='cache/map.geojson',exportedAt]=process.argv.slice(2);
if(!exportedAt||!Number.isFinite(Date.parse(exportedAt)))throw new Error('Usage: node prepare-snapshot.mjs map.geojson export-time-with-timezone');
const before=fs.statSync(input),bytes=fs.readFileSync(input),geo=JSON.parse(bytes);
const groups={core:[],trees:[],contours:[]},counts={};
for(const feature of geo.features){const key=classifyThemed(feature.properties);counts[key]=(counts[key]||0)+1;groups[key==='trees'||key==='contours'?key:'core'].push(feature);}
if(!groups.core.length)throw new Error('Empty map');
const out='snapshot/data';fs.mkdirSync(out,{recursive:true});
const manifest={version:1,exportedAt:new Date(exportedAt).toISOString(),features:geo.features.length,sourceSha256:createHash('sha256').update(bytes).digest('hex'),sourceBytes:bytes.length,counts,layers:{}};
for(const [key,features] of Object.entries(groups)){
 const text=JSON.stringify({type:'FeatureCollection',features}),compressed=gzipSync(text,{level:9});
 const hash=createHash('sha256').update(compressed).digest('hex');
 const file=key+'-'+hash.slice(0,16)+'.geojson.gz';
 fs.writeFileSync(path.join(out,file),compressed);
 manifest.layers[key]={file:'data/'+file,features:features.length,bytes:compressed.length,decodedBytes:Buffer.byteLength(text),sha256:hash};
}
const after=fs.statSync(input);if(before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw new Error('Input changed during preparation; keep the previous manifest and retry after export completion.');
fs.writeFileSync(path.join(out,'manifest.json.tmp'),JSON.stringify(manifest,null,2)+'\n');
fs.renameSync(path.join(out,'manifest.json.tmp'),path.join(out,'manifest.json'));
// Retire only generated chunks no longer referenced by the completed manifest.
const keep=new Set(Object.values(manifest.layers).map(x=>path.basename(x.file)));
for(const name of fs.readdirSync(out))if(/^(core|trees|contours)-[a-f0-9]{16}\.geojson\.gz$/.test(name)&&!keep.has(name))fs.unlinkSync(path.join(out,name));
console.log(JSON.stringify(manifest,null,2));
