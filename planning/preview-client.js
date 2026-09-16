// Read-only visual preview. No credentials, private history or remote writes.
const document=await fetch('./planning/olano-plan-v1.json?v=20260916-prp-first').then(r=>{if(!r.ok)throw Error('No se pudo abrir la vista previa.');return r.json()});
export async function resolveContentContext(){return {negocioId:'vista-previa',negocio:{nombre:'Dr. Olano · vista previa'},canEdit:false,preview:true}}
export const sb={from(table){const b={select(){return b},eq(){return b},order(){return b},range(){return b},maybeSingle(){return b},then(resolve){resolve({data:table==='content_planes_editoriales'?{id:'preview-only',document,revision:1}:[],error:null})}};return b}};
