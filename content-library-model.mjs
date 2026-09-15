export const clean = v => String(v ?? '').trim();
export const norm = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const statusLabels = {APPROVED:'Guion aprobado',RECORDED:'Grabado',EDITED:'Editado',PUBLISHED:'Publicado',MEASURED:'Con métricas',WINNER:'Ganador',NORMAL:'Normal',LOSER:'Bajo rendimiento',RETIRED:'Archivado',NEEDS_REVIEW:'Requiere revisión'};
export const fields = {business:'Negocio objetivo',service:'Servicio',type:'Tipo de tema',objective:'Objetivo',audience:'Temperatura',relationship:'Relación previa',family:'Familia del hook',hook:'ID del hook',status:'Estado'};
export function model(row){
 const e=row.metadata?.content_engine_v1||{};
 return {...row,engine:e,title:clean(row.hook_verbal)||clean(row.titulo)||'Sin título',business:clean(e.target_business)||'Sin clasificar',service:clean(row.servicio)||'Sin clasificar',type:clean(e.topic_type)||'Sin clasificar',objective:clean(row.objetivo)||'Sin clasificar',audience:clean(row.temperatura)||'Sin clasificar',relationship:clean(e.audience_relationship)||'Sin clasificar',family:clean(row.hook_family)||'Sin clasificar',hook:clean(row.hook_id)||'Sin clasificar',status:statusLabels[row.estado]||row.estado||'Sin clasificar',version:clean(e.script_version)||clean(row.metadata?.script_version)||'Sin versión registrada'};
}
export function filterItems(items,filters){return items.filter(x=>{
 if(Object.keys(fields).some(k=>filters[k]&&norm(x[k])!==norm(filters[k])))return false;
 const q=norm(filters.q);if(q&&!norm([x.title,x.content_code,x.business,x.service,x.tema,x.angulo,x.payoff,x.master_script,x.hook,x.family].join(' ')).includes(q))return false;
 const date=clean(x.created_at).slice(0,10);if(filters.from&&(!date||date<filters.from))return false;if(filters.to&&(!date||date>filters.to))return false;return true;
});}
export function related(items,current){return items.filter(x=>x.id!==current.id&&x.negocio_id===current.negocio_id).map(x=>({item:x,reasons:[['business','Mismo negocio objetivo'],['service','Mismo servicio'],['hook','Misma plantilla de hook']].filter(([k])=>x[k]!=='Sin clasificar'&&norm(x[k])===norm(current[k])).map(([,label])=>label).concat(current.engine.topic_id&&x.engine.topic_id===current.engine.topic_id?['Mismo tema registrado']:[])})).filter(x=>x.reasons.length).sort((a,b)=>b.reasons.length-a.reasons.length);}
export function safeUrl(v){try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}}
export async function sha256(text){const bytes=new TextEncoder().encode(text);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('')}
export async function validatePackage(p){
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error('El expediente debe ser un objeto JSON.');
 for(const k of ['titulo','servicio','objetivo','angulo','master_script','hook_verbal','hook_family','hook_id','hook_template','sync_key'])if(!clean(p[k]))throw Error(`Falta ${k} en el expediente.`);
 const match=clean(p.hook_id).match(/^ID-H(\d{3})$/); const id=match?Number(match[1]):0;
 const ranges=[[12,'A'],[20,'B'],[33,'C'],[45,'D'],[48,'E'],[62,'F'],[70,'G'],[76,'H'],[78,'I'],[80,'J'],[83,'K'],[86,'L'],[87,'M'],[90,'N'],[91,'O']];
 if(!id||id>91||!clean(p.hook_family).startsWith(ranges.find(([end])=>id<=end)[1]+'.'))throw Error('El ID o la familia del hook no corresponde al banco.');
 if(p.titulo!==p.hook_verbal)throw Error('El título debe ser el hook hablado exacto.');
 if(!p.master_script.startsWith(p.hook_verbal))throw Error('El guion debe comenzar con el hook exacto.');
 if(p.estado!=='APPROVED')throw Error('Importa una versión con guion aprobado. Los estados posteriores se verifican por separado.');
 const e=p.metadata?.content_engine_v1;
 if(e?.schema_version!=='1.1'||!['OBJECION','MIEDO','DESEO'].includes(e.topic_type))throw Error('Falta clasificación de tema v1.1.');
 for(const k of ['target_business','service_id','topic_id','script_version','proposal_group_id'])if(!clean(e[k]))throw Error(`Falta ${k}.`);
 if(!clean(e.approval?.text)||!clean(e.approval?.context))throw Error('Falta la aprobación y su contexto.');
 if(!Array.isArray(e.sources)||!e.sources.length||e.sources.some(s=>!safeUrl(s.url)||!clean(s.title)))throw Error('Incluye fuentes con título y enlace válido.');
 if(e.production_checklist!==undefined&&(!Array.isArray(e.production_checklist)||e.production_checklist.some(x=>typeof x!=='string')))throw Error('La lista de preparación no es válida.');
 if(!Array.isArray(e.production_route))throw Error('La ruta debe ser una lista, vacía si está pendiente.');
 if(e.production_route.length&&e.production_route.map(s=>s.speech||'').join('\n\n')!==p.master_script)throw Error('La ruta no conserva exactamente el guion aprobado.');
 if(await sha256(p.master_script)!==e.script_sha256)throw Error('El guion no coincide con la huella de su versión aprobada.');
 return p;
}
