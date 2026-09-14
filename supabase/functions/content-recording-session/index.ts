import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

const CORS={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
  "Cache-Control":"no-store",
  "Content-Type":"application/json; charset=utf-8"
};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:CORS});}
function clean(v:unknown){return String(v??"").trim();}
function validUuid(v:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);}

async function sessionPayload(admin:any,session:any){
  const {data:links,error:linksError}=await admin.from("content_sesion_piezas").select("id,pieza_id,orden,estado,notas_equipo,grabado_at").eq("sesion_id",session.id).eq("negocio_id",session.negocio_id).order("orden");
  if(linksError)throw linksError;
  const pieceIds=(links||[]).map((x:any)=>x.pieza_id);
  let pieces:any[]=[];let shots:any[]=[];
  if(pieceIds.length){
    const [pr,sr]=await Promise.all([
      admin.from("content_piezas").select("id,titulo,servicio,tema,objetivo,publico,formato,duracion_seg,hook_verbal,hook_visual,hook_texto,open_loop,rehooks,payoff,cta_master,master_script,presentador,metadata,temperatura,estado,production_status,approved_at").eq("negocio_id",session.negocio_id).in("id",pieceIds),
      admin.from("content_tomas").select("id,pieza_id,orden,tipo,tiempo,funcion,tipo_plano,camara,presentador,mirada_gesto,objeto,accion,que_se_ve,que_se_dice,texto_pantalla,movimiento,toma_seguridad,continuidad,nota_edicion,duracion_seg,linea_que_cubre,reference_url").eq("negocio_id",session.negocio_id).in("pieza_id",pieceIds).order("orden")
    ]);
    if(pr.error||sr.error)throw(pr.error||sr.error);pieces=(pr.data||[]).map((p:any)=>{const metadata={...(p.metadata||{})};delete metadata.image_upload_token;delete metadata.image_upload_token_expires_at;return {...p,metadata};});shots=sr.data||[];
  }
  const pieceMap=new Map(pieces.map((p:any)=>[p.id,p]));
  const shotMap=new Map<string,any[]>();
  for(const s of shots){if(!shotMap.has(s.pieza_id))shotMap.set(s.pieza_id,[]);shotMap.get(s.pieza_id)!.push(s);}
  return {
    session:{id:session.id,nombre:session.nombre,fecha:session.fecha,lugar:session.lugar,notas:session.notas,estado:session.estado},
    items:(links||[]).map((link:any)=>({session_piece_id:link.id,orden:link.orden,estado:link.estado,notas_equipo:link.notas_equipo,grabado_at:link.grabado_at,pieza:pieceMap.get(link.pieza_id)||null,tomas:shotMap.get(link.pieza_id)||[]})).filter((x:any)=>x.pieza)
  };
}

export default {fetch:withSupabase({auth:"none"},async(req,ctx)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
  if(req.method==="GET")return json({ok:true,service:"content-recording-session",version:"3.1.1"});
  if(req.method!=="POST")return json({ok:false,error:"METHOD_NOT_ALLOWED"},405);
  let body:any;try{body=await req.json()}catch{return json({ok:false,error:"JSON_INVALIDO"},400)}
  const action=clean(body?.action||"portal_get");const token=clean(body?.token);
  if(!validUuid(token))return json({ok:false,error:"ENLACE_INVALIDO",message:"Este acceso no es válido."},404);

  const {data:portal,error:portalError}=await ctx.supabaseAdmin.from("content_portal_access").select("negocio_id,enabled").eq("access_token",token).eq("enabled",true).maybeSingle();
  if(portalError)return json({ok:false,error:"ACCESS_LOOKUP_FAILED"},500);
  let negocioId=portal?.negocio_id||null;let fixedSession:any=null;let portalMode=Boolean(portal);

  if(!portalMode){
    const {data:session,error}=await ctx.supabaseAdmin.from("content_sesiones").select("id,negocio_id,nombre,fecha,lugar,notas,estado,share_enabled,expires_at").eq("share_token",token).eq("share_enabled",true).maybeSingle();
    if(error)return json({ok:false,error:"SESSION_LOOKUP_FAILED"},500);
    if(!session)return json({ok:false,error:"ENLACE_NO_DISPONIBLE",message:"Este acceso ya no está disponible."},404);
    if(session.expires_at&&new Date(session.expires_at).getTime()<Date.now())return json({ok:false,error:"ENLACE_VENCIDO",message:"Este acceso ha vencido."},410);
    negocioId=session.negocio_id;fixedSession=session;
  }

  if(action==="portal_get"){
    if(!portalMode)return json({ok:false,error:"PORTAL_ACCESS_REQUIRED"},403);
    const [{data:negocio},{data:sessions,error:sErr},{data:pubs,error:pErr}]=await Promise.all([
      ctx.supabaseAdmin.from("negocios").select("nombre").eq("id",negocioId).maybeSingle(),
      ctx.supabaseAdmin.from("content_sesiones").select("id,nombre,fecha,lugar,notas,estado,created_at").eq("negocio_id",negocioId).neq("estado","ARCHIVADA").order("fecha",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false}),
      ctx.supabaseAdmin.from("content_publicaciones").select("id,content_id,plataforma,url,published_at,resultado").eq("negocio_id",negocioId).eq("estado","PUBLISHED").order("published_at",{ascending:false})
    ]);
    if(sErr||pErr)return json({ok:false,error:"PORTAL_DATA_FAILED"},500);
    const sessionIds=(sessions||[]).map((x:any)=>x.id);let links:any[]=[];
    if(sessionIds.length){const r=await ctx.supabaseAdmin.from("content_sesion_piezas").select("sesion_id,estado").eq("negocio_id",negocioId).in("sesion_id",sessionIds);if(r.error)return json({ok:false,error:"SESSION_COUNT_FAILED"},500);links=r.data||[];}
    const counts=new Map<string,{total:number,recorded:number}>();for(const l of links){const c=counts.get(l.sesion_id)||{total:0,recorded:0};c.total++;if(l.estado==="GRABADO")c.recorded++;counts.set(l.sesion_id,c);}
    const contentIds=[...new Set((pubs||[]).map((x:any)=>x.content_id))];let pieces:any[]=[];
    if(contentIds.length){const r=await ctx.supabaseAdmin.from("content_piezas").select("id,titulo,servicio,tema,formato").eq("negocio_id",negocioId).in("id",contentIds);if(r.error)return json({ok:false,error:"PUBLICATION_DETAIL_FAILED"},500);pieces=r.data||[];}
    const pm=new Map(pieces.map((x:any)=>[x.id,x]));
    const publications=(pubs||[]).map((p:any)=>({...p,pieza:pm.get(p.content_id)||null})).filter((x:any)=>x.pieza);
    return json({ok:true,negocio:{nombre:negocio?.nombre||"Dr. Olano"},sessions:(sessions||[]).map((s:any)=>({...s,...(counts.get(s.id)||{total:0,recorded:0})})),publications});
  }

  if(action==="session_get"){
    let session=fixedSession;
    if(portalMode){
      const sessionId=clean(body?.session_id);if(!validUuid(sessionId))return json({ok:false,error:"SESSION_REQUIRED"},400);
      const {data,error}=await ctx.supabaseAdmin.from("content_sesiones").select("id,negocio_id,nombre,fecha,lugar,notas,estado,share_enabled").eq("id",sessionId).eq("negocio_id",negocioId).neq("estado","ARCHIVADA").maybeSingle();
      if(error)return json({ok:false,error:"SESSION_LOOKUP_FAILED"},500);if(!data)return json({ok:false,error:"SESSION_NOT_FOUND"},404);session=data;
    }
    try{const payload=await sessionPayload(ctx.supabaseAdmin,session);return json({ok:true,...payload});}catch{return json({ok:false,error:"SESSION_DETAIL_FAILED"},500)}
  }

  if(action==="mark_piece"){
    const sessionPieceId=clean(body?.session_piece_id);const next=clean(body?.estado).toUpperCase();
    if(!validUuid(sessionPieceId)||!["PENDIENTE","GRABADO"].includes(next))return json({ok:false,error:"CAMBIO_INVALIDO"},400);
    const {data:row,error}=await ctx.supabaseAdmin.from("content_sesion_piezas").select("id,pieza_id,sesion_id").eq("id",sessionPieceId).eq("negocio_id",negocioId).maybeSingle();
    if(error)return json({ok:false,error:"ITEM_LOOKUP_FAILED"},500);if(!row)return json({ok:false,error:"ITEM_NO_ENCONTRADO"},404);
    if(fixedSession&&row.sesion_id!==fixedSession.id)return json({ok:false,error:"ITEM_NO_ENCONTRADO"},404);
    if(portalMode){const {data:s}=await ctx.supabaseAdmin.from("content_sesiones").select("id").eq("id",row.sesion_id).eq("negocio_id",negocioId).neq("estado","ARCHIVADA").maybeSingle();if(!s)return json({ok:false,error:"SESSION_NOT_AVAILABLE"},403);}
    const {data:result,error:markError}=await ctx.supabaseAdmin.rpc("content_recording_mark",{p_negocio_id:negocioId,p_session_piece_id:row.id,p_estado:next});
    if(markError)return json({ok:false,error:"RECORDING_UPDATE_FAILED",message:"No se pudo confirmar el cambio. Comprueba que la guía y sus imágenes estén listas."},409);
    return json({ok:true,...result});
  }
  return json({ok:false,error:"ACCION_INVALIDA"},400);
})};
