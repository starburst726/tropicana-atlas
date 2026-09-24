import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
export function fixture(){
 const manifest=JSON.parse(fs.readFileSync(new URL('./snapshot/data/manifest.json',import.meta.url)));
 return JSON.parse(gunzipSync(fs.readFileSync(new URL('./snapshot/'+manifest.layers.core.file,import.meta.url))));
}
