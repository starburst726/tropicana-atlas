import assert from 'node:assert/strict';
import fs from 'node:fs';
const root='dist-public';
const html=fs.readFileSync(root+'/index.html','utf8');
assert.ok(html.includes('class="public-view"'));assert.ok(!html.includes('Snapshot map + live camera'));
for(const match of html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)){
 assert.ok(match[1].startsWith('/tropicana-atlas/'),match[1]);
 assert.ok(fs.existsSync(root+'/'+match[1].slice('/tropicana-atlas/'.length)),match[1]);
}
for(const file of fs.readdirSync(root+'/assets')){
 if(!/\.(css|js)$/.test(file))continue;
 const text=fs.readFileSync(root+'/assets/'+file,'utf8');
 assert.ok(!/\/api\/(camera|terrain)|127\.0\.0\.1|localhost|\/data\/map\.geojson/.test(text),'Local API leaked into '+file);
 if(file.endsWith('.css'))for(const m of text.matchAll(/url\(([^)]+)\)/g)){
  const url=m[1].replace(/['"]/g,'');if(url.startsWith('data:'))continue;
  assert.ok(url.startsWith('/tropicana-atlas/'),url);assert.ok(fs.existsSync(root+'/'+url.slice('/tropicana-atlas/'.length)),url);
 }
}
assert.ok(!fs.existsSync(root+'/terrain.json'));assert.ok(!fs.existsSync(root+'/server.py'));
const manifest=JSON.parse(fs.readFileSync(root+'/data/manifest.json'));
for(const item of Object.values(manifest.layers))assert.equal(fs.statSync(root+'/'+item.file).size,item.bytes);
console.log('Static public build verified: project subpath assets, no local APIs, no terrain fallback, complete snapshot.');

const publication=JSON.parse(fs.readFileSync(root+'/data/publication.json'));
assert.equal(publication.publishedAt,process.env.ATLAS_PUBLISHED_AT?new Date(process.env.ATLAS_PUBLISHED_AT).toISOString():null);
