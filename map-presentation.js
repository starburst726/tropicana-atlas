export const neutralThemes=new Set(['transport','utilities','education','healthcare','civic','leisure','land']);
export function groundColor(theme){return theme==='utilities'?'#eeefeb':neutralThemes.has(theme)?'#f0f1e9':'#e8edde';}
export function contextColor(theme,category,fallback){
 if(!neutralThemes.has(theme))return fallback;
 const roads={highways:'#929895',majorRoads:'#b1b6b1',localRoads:'#c4c9c1',pedestrianStreets:'#aaa89a',paths:'#7c8376',rail:'#a5aaa6',airports:'#d1d5d0'};
 if(roads[category]&&!(theme==='transport'&&['paths','pedestrianStreets'].includes(category)))return roads[category];
 if(category==='water')return theme==='utilities'?'#c6dadd':'#bbdce1';
 if(category==='forest')return theme==='utilities'?'#d9ddd5':'#cbdcc0';
 if(category==='parks'&&theme!=='leisure')return '#d9e3ce';
 return fallback;
}
export function routeMetadata(p){return {mode:p.route||p.osm_export_route,ref:String(p.ref||p.osm_export_route_ref||''),name:p.name||p.osm_export_route_name||'',color:p.colour||p.color||p.osm_export_route_color};}
export function routeKey(p){const m=routeMetadata(p);return m.mode+':'+(m.ref||m.name||p.id||'unknown');}
const palette=['#ad385c','#226da5','#357d60','#7951a3','#a56c22','#197f85','#a74d37'];
export function fallbackRouteColor(key){let hash=0;for(const c of key)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;return palette[hash%palette.length];}
export function buildRouteColors(features){const result=new Map();for(const f of features){const p=f.getProperties(),m=routeMetadata(p);if(m.mode&&/^#[0-9a-f]{6}$/i.test(m.color||''))result.set(routeKey(p),m.color);}return result;}
export function routeColor(p,colors){const m=routeMetadata(p);return /^#[0-9a-f]{6}$/i.test(m.color||'')?m.color:colors.get(routeKey(p))||fallbackRouteColor(routeKey(p));}
export function routeBadge(p){const m=routeMetadata(p),abbr=m.name.match(/\(([^)]+)\)$/)?.[1];return abbr||(m.ref?({subway:'Metro',train:'Rail',ferry:'Ferry',bus:'Bus',tram:'Tram',taxi:'Taxi'}[m.mode]||'Route')+' '+m.ref:m.name);}
export function routeLabelPolicy(theme,resolution){
 const primary=theme==='transport';
 if(resolution>=10)return {compact:true,maxTotal:primary?5:3,maxPerRoute:1,repeatDistance:600};
 if(resolution>=4)return {compact:false,maxTotal:primary?8:4,maxPerRoute:1,repeatDistance:550};
 return {compact:false,maxTotal:primary?12:6,maxPerRoute:primary?2:1,repeatDistance:500};
}
