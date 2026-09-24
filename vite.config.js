import {defineConfig} from 'vite';
import fs from 'node:fs';
import path from 'node:path';
const assets=['shield.png','road-overrides.json','area-overrides.json',
 'fonts/public-sans-0.woff2','fonts/public-sans-1.woff2','fonts/public-sans-2.woff2',
 'fonts/material-symbols-rounded-metro.ttf','fonts/Material-Symbols-LICENSE.txt','fonts/Public-Sans-OFL.txt'];
export default defineConfig(({mode})=>{
 const isPublic=mode==='public';
 return {base:isPublic?'/tropicana-atlas/':'/',define:{__PUBLIC_VIEWER__:JSON.stringify(isPublic)},
 publicDir:isPublic?false:'public',build:{outDir:isPublic?'dist-public':'dist'},
 plugins:isPublic?[{name:'public-assets',transformIndexHtml(html){return html.replace('<body>','<body class="public-view">').replace('Loading local export…','Loading map…').replace('Snapshot map + live camera','City snapshot');},closeBundle(){
  for(const asset of assets){const target=path.join('dist-public',asset);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join('public',asset),target);}
  fs.cpSync('snapshot/data','dist-public/data',{recursive:true});
  fs.cpSync('public/licenses','dist-public/licenses',{recursive:true});
  fs.copyFileSync('THIRD_PARTY_NOTICES.md','dist-public/THIRD_PARTY_NOTICES.md');
 }}]:[]};
});
