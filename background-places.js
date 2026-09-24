// Shared geographic context, independent of theme filters and destination icons.
export const backgroundPlaceCategories=new Set(['schools','healthcare','fire','police','postal','parks','powerPlants','substations','utilities']);
export function isBackgroundPlace(category,theme){
 return backgroundPlaceCategories.has(category)&&!theme.focus.includes(category)&&!theme.groups.some(([,keys])=>keys.includes(category));
}
export function backgroundPlaceOpacity(area,resolution){
 const pixels=area/(resolution*resolution);
 if(!Number.isFinite(pixels)||pixels<=16)return 0;
 return .26*Math.min(1,(pixels-16)/48);
}
export function backgroundPlaceColor(hex,opacity){return 'rgba('+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(',')+','+opacity.toFixed(3)+')';}
