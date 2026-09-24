import {categorySymbols,symbolInk} from './destination-symbols.js';
import {contextColor} from './map-presentation.js';
import {themes,categories,layerAtScale,zoomHint,routes,gettingAroundThemes,contextTransitDefaults} from './themes.js';
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
export function renderThemeBar(current,onSelect){
 const bar=document.querySelector('#theme-bar');
 const reveal=()=>bar.querySelector('input:checked')?.closest('label').scrollIntoView({block:'nearest',inline:'nearest'});
 if(!bar.dataset.resizeReady){new ResizeObserver(reveal).observe(bar);bar.dataset.resizeReady='1';}
 if(bar.children.length){const changed=bar.querySelector('input:checked')?.value!==current;for(const input of bar.querySelectorAll('input'))input.checked=input.value===current;if(changed)reveal();return;}bar.replaceChildren();
 for(const [id,theme] of Object.entries(themes)){
  const row=el('label',null,'theme-option'),input=el('input');input.type='radio';input.name='map-theme';input.value=id;input.checked=id===current;input.onchange=()=>{onSelect(id);reveal();};
  const icon=el('span',theme.icon,'theme-icon material-symbols-rounded');icon.setAttribute('aria-hidden','true');row.append(input,icon,el('span',theme.label));bar.append(row);
 }
 reveal();
}
export function renderThemePanel({theme,visible,counts,routeColors,routeKeyItems=[],resolution,backgroundPlaces,onBackground,boundary,onBoundary,onChange,onReset}){
 const spec=themes[theme],root=document.querySelector('#layers');
 const oldOpen=new Map([...root.querySelectorAll('details[data-group]')].map(d=>[d.dataset.group,d.open]));
 const sameTheme=root.dataset.theme===theme,active=document.activeElement,focusKey=active?.dataset?.layer,focusLabel=active?.getAttribute('aria-label');
 root.dataset.theme=theme;root.replaceChildren();
 document.querySelector('#theme-title').textContent=spec.label;
 document.querySelector('#theme-description').textContent=spec.description;
 function row(key){
  const label=el('label',null,'layer'),check=el('input');check.type='checkbox';check.checked=visible.has(key);check.disabled=!counts.get(key);check.dataset.layer=key;check.onchange=()=>onChange([key],check.checked);
  const swatch=categorySymbols[key]?el('span',categorySymbols[key],'material-symbols-rounded filter-symbol'):el('i');swatch.setAttribute('aria-hidden','true');if(categorySymbols[key])swatch.style.color=symbolInk(categories[key][2]);else swatch.style.background=contextColor(theme,key,categories[key][2]);label.append(check,swatch,el('span',categories[key][1]));
  if(!counts.get(key))label.append(el('small','Unavailable'));
  const hint=visible.has(key)?zoomHint(key,resolution):'';if(hint){const note=el('small',hint,'scale-hint');note.setAttribute('aria-hidden','true');label.append(note);label.title=hint;}return label;
 }
 for(const [title,keys] of spec.groups){
  if(!keys.some(k=>counts.get(k)))continue;
  if(keys.length===1){const single=el('div',null,'single-filter');single.append(row(keys[0]));root.append(single);continue;}
  const details=el('details',null,'filter-group');details.dataset.group=title;details.open=sameTheme&&oldOpen.has(title)?oldOpen.get(title):!(spec.collapsed?.includes(title)||(theme==='explore'&&title==='Community landmarks'));const summary=el('summary');
  const select=el('input');select.type='checkbox';select.setAttribute('aria-label','All '+title.toLowerCase());
  const available=keys.filter(k=>counts.get(k));const n=available.filter(k=>visible.has(k)).length;select.checked=!!available.length&&n===available.length;select.indeterminate=n>0&&n<available.length;select.disabled=!available.length;
  select.onclick=e=>e.stopPropagation();select.onchange=()=>onChange(available,select.checked);summary.append(select,el('span',title));details.append(summary);
  for(const k of keys)if(counts.get(k))details.append(row(k));root.append(details);
 }
 if(gettingAroundThemes.has(theme)){
  const around=el('details',null,'getting-around');around.dataset.group='getting-around';around.open=sameTheme&&oldOpen.get('getting-around')||false;around.append(el('summary','Getting around'));
  const available=routes.filter(k=>counts.get(k)),on=available.filter(k=>visible.has(k));
  const group=el('details',null,'filter-group');group.dataset.group='context-transit';group.open=sameTheme&&oldOpen.get('context-transit')||false;
  const summary=el('summary'),master=el('input');master.type='checkbox';master.dataset.layer='context-transit';master.setAttribute('aria-label','Transit routes');master.checked=on.length>0;master.indeterminate=on.length>0&&on.length<available.length;
  master.onclick=e=>e.stopPropagation();master.onchange=()=>onChange(master.checked?contextTransitDefaults.filter(k=>available.includes(k)):available,master.checked);
  summary.append(master,el('span','Transit routes'));group.append(summary);for(const k of available)group.append(row(k));around.append(group);
  if(counts.get('stops'))around.append(row('stops'));
  if(theme==='roads'){if(counts.get('paths'))around.append(row('paths'));}
  else {
   const pathLabel=el('label',null,'layer'),check=el('input');check.type='checkbox';check.dataset.layer='context-paths';const keys=['paths','pedestrianStreets'].filter(k=>counts.get(k));check.checked=visible.has('paths');check.indeterminate=keys.some(k=>visible.has(k))&&!keys.every(k=>visible.has(k));check.onchange=()=>onChange(keys,check.checked);pathLabel.append(check,el('span','Paths & pedestrian streets'));around.append(pathLabel);
  }
  if(theme!=='roads'&&counts.get('parking'))around.append(row('parking'));
  around.append(el('p','Roads remain visible for orientation. Choices are remembered for this view.','note'));root.append(around);
 }
 if(spec.note)root.append(el('p',spec.note,'note'));
 const context=el('details');context.dataset.group='map-details';context.open=oldOpen.get('map-details')||false;context.append(el('summary','Map details'));
 const backgroundRow=el('label',null,'layer'),backgroundCheck=el('input');backgroundCheck.type='checkbox';backgroundCheck.dataset.layer='background-places';backgroundCheck.checked=backgroundPlaces;backgroundCheck.onchange=()=>onBackground(backgroundCheck.checked);backgroundRow.append(backgroundCheck,el('span','Background places'));context.append(backgroundRow);context.append(el('p','Faint school, medical, civic, park and utility areas. Shared across views; no extra icons.','note'));
 const boundaryRow=el('label',null,'layer'),check=el('input');check.type='checkbox';check.dataset.layer='county-boundary';check.checked=boundary;check.onchange=()=>onBoundary(check.checked);boundaryRow.append(check,el('span','County boundaries & names'));context.append(boundaryRow);
 for(const k of ['contours','trees','places'])context.append(row(k));root.append(context);
 const reset=el('button','Reset view settings','reset-theme');reset.onclick=onReset;root.append(reset);
 const legend=document.querySelector('#theme-legend'),keyOpen=legend.querySelector('details')?.open||false;legend.replaceChildren(el('h3','Map key'));
 let entries=0;for(const k of new Set([...spec.legend,...(gettingAroundThemes.has(theme)?[...routes,'stops','paths','parking']:[])])){if(!visible.has(k)||!counts.get(k)||!layerAtScale(k,resolution))continue;const item=el('div',null,'legend-item'),swatch=el('i');const colors=[...(routeColors.get(k)||[])];swatch.style.background=colors.length>1?'linear-gradient(90deg,'+colors.slice(0,6).join(',')+')':colors[0]||contextColor(theme,k,categories[k][2]);if(categorySymbols[k]){const icon=el('span',categorySymbols[k],'material-symbols-rounded filter-symbol');icon.setAttribute('aria-hidden','true');icon.style.color=symbolInk(categories[k][2]);item.append(icon);}else item.append(swatch);item.append(el('span',categories[k][1]));legend.append(item);entries++;}
 if(routeKeyItems.length){
  const key=el('details',null,'route-key');key.open=keyOpen;key.append(el('summary','Route key'));
  for(const r of routeKeyItems){const item=el('div',null,'legend-item'),swatch=el('i');swatch.style.background=r.color;item.append(swatch,el('span',r.title));key.append(item);}legend.append(key);
  legend.append(el('p','Exported route colors where available; consistent atlas colors otherwise. More labels appear as you zoom in.','note'));
 }
 if(visible.has('stops'))legend.append(el('p','M marks stations and stops whose mode is unspecified in the export. Identified modes use their own symbols.','note'));
 if(theme==='explore')legend.append(el('p','Small amenities appear as you zoom into neighborhoods.','note'));
 if(theme==='land'&&visible.has('fishing'))legend.append(el('p','Fishing areas are outlined over water.','note'));
 if(!entries)legend.append(el('p','No theme layers selected.','note'));
 const data=document.querySelector('#data-counts');data.replaceChildren();
 if(sameTheme&&(focusKey||focusLabel)){const target=[...root.querySelectorAll('input')].find(i=>focusKey?i.dataset.layer===focusKey:i.getAttribute('aria-label')===focusLabel);target?.focus({preventScroll:true});}
 for(const [k,count]of counts){const item=el('div',null,'data-count');item.append(el('span',categories[k][1]),el('span',count.toLocaleString()));data.append(item);}
}
