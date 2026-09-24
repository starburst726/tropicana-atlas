import {defineConfig} from 'vite';
import fs from 'node:fs';
import path from 'node:path';
const assets=['shield.png','road-overrides.json','area-overrides.json',
 'fonts/public-sans-0.woff2','fonts/public-sans-1.woff2','fonts/public-sans-2.woff2',
 'fonts/material-symbols-rounded-metro.ttf','fonts/Material-Symbols-LICENSE.txt','fonts/Public-Sans-OFL.txt'];
export default defineConfig(({mode})=>{
 const isPublic=mode==='public';
 const publishedAt=process.env.ATLAS_PUBLISHED_AT||null;
 if(publishedAt&&!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(publishedAt))throw new Error('ATLAS_PUBLISHED_AT must be an ISO timestamp with timezone');
 if(publishedAt&&!Number.isFinite(Date.parse(publishedAt)))throw new Error('Invalid publication timestamp');
 return {base:isPublic?'/tropicana-atlas/':'/',define:{__PUBLIC_VIEWER__:JSON.stringify(isPublic)},
 publicDir:isPublic?false:'public',build:{outDir:isPublic?'dist-public':'dist'},
 plugins:isPublic?[{name:'public-assets',transformIndexHtml(html){return html.replace('<body>','<body class="public-view">').replace('Loading local export…','Loading map…').replace('Snapshot map + live camera','City snapshot');},closeBundle(){
  for(const asset of assets){const target=path.join('dist-public',asset);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join('public',asset),target);}
  fs.cpSync('snapshot/data','dist-public/data',{recursive:true});
  fs.writeFileSync('dist-public/data/publication.json',JSON.stringify({publishedAt:publishedAt?new Date(publishedAt).toISOString():null})+'\n');
  fs.cpSync('public/licenses','dist-public/licenses',{recursive:true});
  fs.copyFileSync('THIRD_PARTY_NOTICES.md','dist-public/THIRD_PARTY_NOTICES.md');
 }}]:[]};
});
