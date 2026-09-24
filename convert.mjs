import fs from 'node:fs';
import osmtogeojson from 'osmtogeojson';
import {DOMParser} from '@xmldom/xmldom';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: node convert.mjs input.osm output.geojson');
const xml = fs.readFileSync(input, 'utf8');
const doc = new DOMParser().parseFromString(xml, 'text/xml');
const geo = osmtogeojson(doc, {flatProperties: true});
geo.features = geo.features.filter(f => f.geometry.type !== 'Point' || Object.keys(f.properties).some(k => !['timestamp','version','id','changeset','user','uid'].includes(k)));
if (!geo.features.length) throw new Error('No map features found in export');
const counts = {};
for (const f of geo.features) {
  counts[f.geometry.type] = (counts[f.geometry.type] || 0) + 1;
}
fs.writeFileSync(output + '.tmp', JSON.stringify(geo));
fs.renameSync(output + '.tmp', output);
console.log(JSON.stringify({features: geo.features.length, geometry: counts}));
