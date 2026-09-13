import { sb, resolveContentContext } from './content-vault-client.js';

export { sb, resolveContentContext };

const clean=(v)=>String(v??'').trim();
const norm=(v)=>clean(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');

export async function listProductionSessions(negocioId){
  const {data:sessions,error}=await sb.from('content_sesiones').select('*').eq('negocio_id',negocioId).neq('estado','ARCHIVADA').order('fecha',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false});
  if(error)throw error;
  const ids=(sessions||[]).map(x=>x.id);
  if(!ids.length)return [];
  const {data:links,error:linksError}=await sb.from('content_sesion_piezas').select('sesion_id,estado').in('sesion_id',ids);
  if(linksError)throw linksError;
  const counts=new Map();
  for(const row of links||[]){const c=counts.get(row.sesion_id)||{total:0,recorded:0};c.total++;if(row.estado==='GRABADO')c.recorded++;counts.set(row.sesion_id,c);}
  return (sessions||[]).map(s=>({...s,...(counts.get(s.id)||{total:0,recorded:0})}));
}

export async function listProductionPieces(negocioId){
  const {data,error}=await sb.from('content_piezas')
    .select('id,content_code,titulo,servicio,tema,objetivo,publico,formato,duracion_seg,hook_verbal,master_script,estado,production_status,created_at')
    .eq('negocio_id',negocioId).neq('estado','RETIRED').order('created_at',{ascending:false});
  if(error)throw error;return data||[];
}

export async function createProductionSession(input,ctx,pieceIds=[]){
  if(!ctx?.canEdit)throw new Error('Tu rol no permite crear sesiones.');
  const payload={
    negocio_id:ctx.negocioId,
    nombre:clean(input.nombre),
    fecha:clean(input.fecha)||null,
    lugar:clean(input.lugar)||null,
    notas:clean(input.notas)||null,
    estado:'BORRADOR'
  };
  if(!payload.nombre)throw new Error('Escribe un nombre para la sesión.');
  const {data:session,error}=await sb.from('content_sesiones').insert(payload).select('*').single();
  if(error)throw error;
  if(pieceIds.length){
    const rows=pieceIds.map((pieza_id,i)=>({negocio_id:ctx.negocioId,sesion_id:session.id,pieza_id,orden:i+1}));
    const {error:linkError}=await sb.from('content_sesion_piezas').insert(rows);
    if(linkError){await sb.from('content_sesiones').delete().eq('id',session.id).eq('negocio_id',ctx.negocioId);throw linkError;}
  }
  return session;
}

export async function getProductionSession(sessionId,negocioId){
  const {data:session,error}=await sb.from('content_sesiones').select('*').eq('id',sessionId).eq('negocio_id',negocioId).single();
  if(error)throw error;
  const {data:links,error:linksError}=await sb.from('content_sesion_piezas').select('*').eq('sesion_id',sessionId).eq('negocio_id',negocioId).order('orden');
  if(linksError)throw linksError;
  const ids=(links||[]).map(x=>x.pieza_id);
  let pieces=[];
  if(ids.length){
    const {data,error:pieceError}=await sb.from('content_piezas').select('*').in('id',ids).eq('negocio_id',negocioId);
    if(pieceError)throw pieceError;pieces=data||[];
  }
  const map=new Map(pieces.map(x=>[x.id,x]));
  return {session,items:(links||[]).map(link=>({...link,pieza:map.get(link.pieza_id)})).filter(x=>x.pieza)};
}

export async function addPiecesToSession(sessionId,negocioId,pieceIds){
  if(!pieceIds?.length)return;
  const {data:existing,error}=await sb.from('content_sesion_piezas').select('pieza_id,orden').eq('sesion_id',sessionId).eq('negocio_id',negocioId).order('orden');
  if(error)throw error;
  const have=new Set((existing||[]).map(x=>x.pieza_id));
  let order=(existing||[]).reduce((m,x)=>Math.max(m,x.orden||0),0);
  const rows=pieceIds.filter(id=>!have.has(id)).map(id=>({negocio_id:negocioId,sesion_id:sessionId,pieza_id:id,orden:++order}));
  if(!rows.length)return;
  const {error:insertError}=await sb.from('content_sesion_piezas').insert(rows);if(insertError)throw insertError;
}

export async function removePieceFromSession(linkId,sessionId,negocioId){
  const {error}=await sb.from('content_sesion_piezas').delete().eq('id',linkId).eq('sesion_id',sessionId).eq('negocio_id',negocioId);if(error)throw error;
}

export async function updateSession(sessionId,negocioId,patch){
  const safe={...patch};delete safe.id;delete safe.negocio_id;delete safe.created_by;delete safe.created_at;delete safe.share_token;
  const {data,error}=await sb.from('content_sesiones').update(safe).eq('id',sessionId).eq('negocio_id',negocioId).select('*').single();if(error)throw error;return data;
}

export async function rotateShareToken(sessionId,negocioId){
  const token=crypto.randomUUID();
  const {data,error}=await sb.from('content_sesiones').update({share_token:token,share_enabled:true}).eq('id',sessionId).eq('negocio_id',negocioId).select('*').single();
  if(error)throw error;return data;
}

export async function setAdminRecordingStatus(linkId,sessionId,negocioId,estado){
  const next=String(estado||'').toUpperCase();if(!['PENDIENTE','GRABANDO','GRABADO','REPETIR'].includes(next))throw new Error('Estado inválido.');
  const patch={estado:next,grabado_at:next==='GRABADO'?new Date().toISOString():null};
  const {data,error}=await sb.from('content_sesion_piezas').update(patch).eq('id',linkId).eq('sesion_id',sessionId).eq('negocio_id',negocioId).select('*').single();if(error)throw error;
  if(next==='GRABADO'){
    const {data:link}=await sb.from('content_sesion_piezas').select('pieza_id').eq('id',linkId).single();
    if(link?.pieza_id){
      const {data:piece}=await sb.from('content_piezas').select('production_status,estado').eq('id',link.pieza_id).eq('negocio_id',negocioId).maybeSingle();
      if(piece){const production={...(piece.production_status||{}),RECORDED:true};const contentPatch={production_status:production};if(piece.estado==='APPROVED')contentPatch.estado='RECORDED';await sb.from('content_piezas').update(contentPatch).eq('id',link.pieza_id).eq('negocio_id',negocioId);}
    }
  }
  return data;
}

export async function listShots(pieceId,negocioId){
  const {data,error}=await sb.from('content_tomas').select('*').eq('pieza_id',pieceId).eq('negocio_id',negocioId).order('tipo').order('orden');if(error)throw error;return data||[];
}

export async function replaceShots(pieceId,negocioId,shots){
  const {error:deleteError}=await sb.from('content_tomas').delete().eq('pieza_id',pieceId).eq('negocio_id',negocioId);if(deleteError)throw deleteError;
  if(!shots?.length)return [];
  const counters={PRINCIPAL:0,BROLL:0};
  const rows=shots.map(s=>{
    const tipo=s.tipo==='BROLL'?'BROLL':'PRINCIPAL';
    counters[tipo]+=1;
    return {
      negocio_id:negocioId,pieza_id:pieceId,tipo,orden:counters[tipo],
      plano_id:clean(s.plano_id)||null,tiempo:clean(s.tiempo)||null,funcion:clean(s.funcion)||null,
      tipo_plano:clean(s.tipo_plano)||null,camara:clean(s.camara)||null,presentador:clean(s.presentador)||null,
      mirada_gesto:clean(s.mirada_gesto)||null,objeto:clean(s.objeto)||null,accion:clean(s.accion)||null,
      que_se_ve:clean(s.que_se_ve)||null,que_se_dice:clean(s.que_se_dice)||null,texto_pantalla:clean(s.texto_pantalla)||null,
      movimiento:clean(s.movimiento)||null,toma_seguridad:clean(s.toma_seguridad)||null,continuidad:clean(s.continuidad)||null,
      nota_edicion:clean(s.nota_edicion)||null,duracion_seg:Number.isFinite(Number(s.duracion_seg))?Number(s.duracion_seg):null,
      linea_que_cubre:clean(s.linea_que_cubre)||null,reference_url:clean(s.reference_url)||null
    };
  });
  const {data,error}=await sb.from('content_tomas').insert(rows).select('*');if(error)throw error;return data||[];
}

const FIELD_MAP={
  PLANO_ID:'plano_id',TIEMPO:'tiempo',FUNCION:'funcion',TIPO_DE_PLANO:'tipo_plano',CAMARA_ALTURA_DISTANCIA:'camara',CAMARA:'camara',
  PRESENTADOR:'presentador',MIRADA_GESTO:'mirada_gesto',OBJETO:'objeto',ACCION:'accion',QUE_SE_VE:'que_se_ve',QUE_SE_DICE:'que_se_dice',
  TEXTO_PANTALLA:'texto_pantalla',MOVIMIENTO:'movimiento',TOMA_SEGURIDAD:'toma_seguridad',CONTINUIDAD:'continuidad',NOTA_EDICION:'nota_edicion',
  BROLL_ID:'plano_id',DURACION:'duracion_seg',LINEA_QUE_CUBRE:'linea_que_cubre',REFERENCIA:'reference_url',IMAGEN:'reference_url',IMAGEN_URL:'reference_url'
};
const KNOWN=new Set(Object.keys(FIELD_MAP));

export function parseShotsPackage(text){
  const source=clean(text).replace(/^```(?:text)?\s*/i,'').replace(/```$/i,'').trim();
  if(!source)throw new Error('Pega primero el MAPA DE PLANOS o B-ROLL.');
  const shots=[];let current=null;let activeField=null;let buffer=[];
  const flushField=()=>{if(!current||!activeField)return;const value=buffer.join('\n').trim();if(value)current[FIELD_MAP[activeField]]=value;activeField=null;buffer=[];};
  const flushShot=()=>{flushField();if(current){shots.push(current);current=null;}};
  for(const raw of source.split(/\r?\n/)){
    const line=raw.trimEnd();const match=line.match(/^([^:]{2,60}):\s*(.*)$/);
    if(match){const key=norm(match[1]);if(KNOWN.has(key)){
      if(key==='PLANO_ID'||key==='BROLL_ID'){flushShot();current={tipo:key==='BROLL_ID'?'BROLL':'PRINCIPAL'};}
      if(!current)current={tipo:key==='BROLL_ID'?'BROLL':'PRINCIPAL'};
      flushField();activeField=key;buffer=match[2]?[match[2]]:[];continue;
    }}
    if(activeField)buffer.push(line);
  }
  flushShot();
  const filtered=shots.filter(s=>Object.keys(s).some(k=>k!=='tipo'&&clean(s[k])));
  if(!filtered.length)throw new Error('No encontré bloques PLANO_ID: o BROLL_ID: en el texto.');
  return filtered;
}
