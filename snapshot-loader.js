// Paths stay under the project URL, including on GitHub Pages.
export function assetUrl(path){return import.meta.env.BASE_URL+path.replace(/^\//,'');}
export async function readJson(response){
 if(!response.ok)throw new Error('Map data could not be loaded. Please try again.');
 const bytes=new Uint8Array(await response.arrayBuffer());
 // Some hosts decode Content-Encoding automatically; also accept that response.
 if(bytes[0]===0x1f&&bytes[1]===0x8b){
  if(typeof DecompressionStream==='undefined')throw new Error('This map needs a browser with gzip support. Please update your browser.');
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
 }
 return JSON.parse(new TextDecoder().decode(bytes));
}
export function lazySnapshotLoader(manifest,fetchJson){
 const loaded=new Set(),pending=new Map();
 return {loaded,async load(key){
  if(loaded.has(key))return null;
  if(pending.has(key))return pending.get(key);
  const entry=manifest.layers[key];if(!entry)throw new Error('Unknown map layer: '+key);
  const request=fetchJson(entry.file).then(data=>{loaded.add(key);return data;}).finally(()=>pending.delete(key));
  pending.set(key,request);return request;
 }};
}
