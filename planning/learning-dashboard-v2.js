import {sb,resolveContentContext} from '../content-vault-client.js?v=20260919-learning-v2';

const TZ='America/Lima';
const P={TIKTOK:'TikTok',INSTAGRAM:'Instagram',FACEBOOK:'Facebook'};
const PERIOD={DAILY:'Día',WEEKLY:'Semana',MONTHLY:'Mes',YEARLY:'Año',ROLLING:'Rolling'};
const EVID={INSUFFICIENT:'Faltan datos',EXPLORATORY:'Señal inicial',REPEATED_OBSERVATION:'Patrón repetido',CONTROLLED_TEST:'Prueba controlada'};
const HYP={INSUFFICIENT:'Faltan datos',EARLY_SIGNAL:'Señal inicial',SUPPORTING:'Se repite',MIXED:'Resultado mixto',CONTRADICTING:'No se repite',RETIRED:'Cerrada'};
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const fmt=v=>n(v)===null?'—':new Intl.NumberFormat('es-PE',{maximumFractionDigits:1}).format(Number(v));
const pct=v=>n(v)===null?'—':Number(v).toFixed(Number(v)%1?1:0)+'%';
const dt=v=>v?new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:TZ}).format(new Date(v)):'—';
const key=v=>String(v||'').replaceAll('_',' ').toLowerCase().replace(/^./,x=>x.toUpperCase());
const pill=(v,k='')=>'<span class="learn-pill '+esc(k)+'">'+esc(v)+'</span>';
const root=()=>document.querySelector('#learningApp');

async function mountBusinessSwitcher(ctx){
 const tenant=document.querySelector('.tenant');
 let wrap=document.querySelector('[data-business-switcher]');
 if(!wrap){
   wrap=document.createElement('label');
   wrap.className='business-switcher';
   wrap.dataset.businessSwitcher='';
   wrap.innerHTML='<span>Negocio activo</span><select id="businessSwitcher" aria-label="Elegir negocio"><option value="">Cargando negocios…</option></select>';
   tenant?.insertAdjacentElement('afterend',wrap);
 }
 const select=wrap.querySelector('#businessSwitcher')||wrap.querySelector('select');
 if(!select)return;
 const ids=[...new Set((ctx.memberships||[]).map(x=>x.negocio_id).filter(Boolean))];
 const {data,error}=ids.length
   ? await sb.from('negocios').select('id,nombre,slug').in('id',ids).order('nombre')
   : {data:[],error:null};
 if(error)throw error;
 const businesses=data||[];
 select.innerHTML=businesses.length
   ? businesses.map(b=>'<option value="'+esc(b.id)+'">'+esc(b.nombre)+'</option>').join('')
   : '<option value="'+esc(ctx.negocioId)+'">'+esc(ctx.negocio?.nombre||'Negocio actual')+'</option>';
 select.value=String(ctx.negocioId);
 wrap.hidden=false;
 select.onchange=()=>{
   const id=select.value;
   if(!id||id===String(ctx.negocioId))return;
   localStorage.setItem('impulso_negocio_activo',id);
   const u=new URL(location.href);
   u.searchParams.set('negocio',id);
   u.searchParams.delete('week');
   u.searchParams.delete('tema');
   location.assign(u.toString());
 };
}
const metric=(o,k)=>n(o?.[k]);
const interactions=m=>metric(m,'interactions')??['likes','reactions','comments','shares','saves','clicks','reposts'].reduce((a,k)=>a+(metric(m,k)||0),0);
const hashtags=v=>Array.isArray(v)&&v.length?v.map(x=>String(x).startsWith('#')?x:'#'+x).join(' '):'No registrados';
const projectLabel=x=>'PROYECTO '+String(Number(x)||0).padStart(4,'0');

function latestSnapshots(rows){
  const m=new Map();
  rows.forEach(r=>{const p=m.get(r.publication_id);if(!p||new Date(r.snapshot_at)>new Date(p.snapshot_at))m.set(r.publication_id,r)});
  return [...m.values()];
}
function weightedMap(rows,field){
  const totals={},weights={};
  rows.forEach(r=>{
    const map=r.audience?.[field]||{};
    const w=metric(r.metrics,'views')||1;
    Object.entries(map).forEach(([k,v])=>{if(n(v)!==null){totals[k]=(totals[k]||0)+Number(v)*w;weights[k]=(weights[k]||0)+w}})
  });
  return Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,v/weights[k]]).sort((a,b)=>b[1]-a[1]));
}
function bars(map){
  const items=Object.entries(map||{}).slice(0,7);
  if(!items.length)return '<p class="muted">Sin datos disponibles.</p>';
  const max=Math.max(...items.map(x=>Number(x[1])||0),1);
  return '<div class="bar-list">'+items.map(([k,v])=>'<div class="bar-row"><span>'+esc(key(k))+'</span><div class="bar-track"><i style="width:'+Math.max(2,(Number(v)||0)/max*100)+'%"></i></div><b>'+esc(pct(v))+'</b></div>').join('')+'</div>';
}
function stat(label,value,note){
  return '<div class="learn-stat"><span>'+esc(label)+'</span><b>'+esc(value)+'</b><small>'+esc(note||'')+'</small></div>';
}
function projectNum(piece,labels){
  return labels.get(piece.id)?.project_display_number||piece.metadata?.project_ref_v1?.project_number||piece.metadata?.web_display_number||piece.content_num;
}
function scriptVersion(piece){
  return piece.metadata?.script_revision_v1?.approved_script_version||piece.metadata?.approved_script_version||piece.metadata?.script_version||piece.metadata?.guion_id||'No registrada';
}
async function loadData(){
  const ctx=await resolveContentContext();
  document.querySelectorAll('[data-business]').forEach(el=>el.textContent=ctx.negocio?.nombre||'Negocio');
  await mountBusinessSwitcher(ctx);
  const q=await Promise.all([
    sb.from('content_piezas').select('id,content_num,content_code,titulo,servicio,objetivo,categoria,formato,hook_family,hook_id,hook_verbal,rehooks,cta_family,cta_master,master_script,metadata,estado').eq('negocio_id',ctx.negocioId),
    sb.from('content_publicaciones').select('id,content_id,plataforma,estado,url,caption,hashtags,published_at,metricas,resultado,metadata,publication_package_id,package_match_status').eq('negocio_id',ctx.negocioId),
    sb.from('content_metric_snapshots').select('*').eq('negocio_id',ctx.negocioId).order('snapshot_at',{ascending:false}),
    sb.from('content_publication_packages').select('*').eq('negocio_id',ctx.negocioId).order('prepared_at',{ascending:false}),
    sb.from('content_public_project_labels').select('*').eq('negocio_id',ctx.negocioId),
    sb.from('content_strategy_signals').select('*').eq('negocio_id',ctx.negocioId).order('created_at',{ascending:false}),
    sb.from('content_hypotheses').select('*').eq('negocio_id',ctx.negocioId).order('updated_at',{ascending:false}),
    sb.from('content_learning_recommendations').select('*').eq('negocio_id',ctx.negocioId).eq('status','ACTIVE').order('generated_at',{ascending:false}),
    sb.from('content_execution_performance').select('*').eq('negocio_id',ctx.negocioId).order('observed_at',{ascending:false}),
    sb.from('content_execution_library_items').select('id,library_type,source_id,family').eq('negocio_id',ctx.negocioId),
    sb.from('content_comments').select('*').eq('negocio_id',ctx.negocioId).order('commented_at',{ascending:false}),
    sb.from('content_comment_analysis').select('*').eq('negocio_id',ctx.negocioId).order('analyzed_at',{ascending:false})
  ]);
  const bad=q.find(x=>x.error);if(bad)throw bad.error;
  const [pieces,pubs,snaps,packs,labels,signals,hyps,recs,perf,lib,comments,commentAnalysis]=q.map(x=>x.data||[]);
  return {ctx,pieces,pubs,snaps,packs,labels,signals,hyps,recs,perf,lib,comments,commentAnalysis};
}
function model(d){
  const pm=new Map(d.pieces.map(x=>[x.id,x])),lm=new Map(d.labels.map(x=>[x.content_id,x])),pk=new Map(d.packs.map(x=>[x.id,x])),li=new Map(d.lib.map(x=>[x.id,x]));
  const latest=latestSnapshots(d.snaps),sm=new Map(latest.map(x=>[x.publication_id,x]));
  const pubs=d.pubs.map(x=>({...x,piece:pm.get(x.content_id),project:projectLabel(projectNum(pm.get(x.content_id)||{},lm)),snap:sm.get(x.id),pack:pk.get(x.publication_package_id)}));
  return {...d,pm,lm,pk,li,latest,pubs};
}
function summary(m){
  const views=m.latest.reduce((a,x)=>a+(metric(x.metrics,'views')||0),0);
  const ints=m.latest.reduce((a,x)=>a+interactions(x.metrics),0);
  const clicks=m.latest.reduce((a,x)=>a+(metric(x.metrics,'clicks')||0),0);
  return '<section class="learn-section"><div class="section-head"><div><span>RESUMEN</span><h2>Estado de aprendizaje</h2></div>'+pill(m.snaps.length+' snapshots','info')+'</div><div class="learn-stats">'+
    stat('Publicaciones reales',m.pubs.filter(x=>x.estado==='PUBLISHED').length,'registros por plataforma')+
    stat('Views observadas',fmt(views),'último snapshot de cada publicación')+
    stat('Interacciones',fmt(ints),'según cada plataforma')+
    stat('Clics',fmt(clicks),'cuando están disponibles')+
    stat('Videos medidos',new Set(m.latest.map(x=>x.content_id)).size,'con al menos un snapshot')+
    stat('Comentarios con texto',m.comments.filter(x=>!x.is_creator_reply).length,'voz de audiencia ingerida')+
    stat('Hipótesis abiertas',m.hyps.filter(x=>x.status!=='RETIRED').length,'con siguiente prueba')+
  '</div></section>';
}
function recommendations(m){
  const periods=['DAILY','WEEKLY','MONTHLY','YEARLY'];
  return '<section class="learn-section"><div class="section-head"><div><span>RECOMENDACIONES</span><h2>Qué conviene hacer ahora</h2><p>Directo, accionable y con nivel de evidencia visible.</p></div></div><div class="rec-grid">'+periods.map(p=>{
    const rows=m.recs.filter(x=>x.period_type===p);
    return '<div class="rec-col"><h3>'+PERIOD[p]+'</h3>'+(rows.length?rows.map(r=>'<article class="rec-card"><div><b>'+esc(key(r.dimension))+'</b>'+pill(EVID[r.evidence_level]||r.evidence_level,r.evidence_level==='INSUFFICIENT'?'warn':'ok')+'</div><p>'+esc(r.recommendation)+'</p><small>'+esc(r.reasoning_summary)+' · muestra '+esc(r.sample_size)+'</small></article>').join(''):'<p class="muted">Sin recomendación todavía.</p>')+'</div>';
  }).join('')+'</div></section>';
}
function projects(m){
  const ids=[...new Set(m.latest.map(x=>x.content_id))];
  return '<section class="learn-section"><div class="section-head"><div><span>POR PROYECTO</span><h2>Resultados sin perder el contexto creativo</h2></div></div><div class="project-grid">'+(ids.length?ids.map(id=>{
    const piece=m.pm.get(id);if(!piece)return '';
    const pn=projectLabel(projectNum(piece,m.lm)),pubs=m.pubs.filter(x=>x.content_id===id);
    return '<article class="project-card"><div class="project-top"><div><b>'+esc(pn)+'</b><h3>'+esc(piece.titulo||piece.content_code)+'</h3><small>'+esc(piece.servicio)+' · '+esc(piece.formato||'formato no registrado')+'</small></div>'+pill(piece.estado)+'</div><div class="platform-mini">'+pubs.map(pub=>{
      const s=pub.snap?.metrics||{};
      return '<div><b>'+esc(P[pub.plataforma])+'</b><span>'+esc(fmt(metric(s,'views')))+' views</span><span>'+esc(metric(s,'avg_watch_time_seconds')===null?'watch —':'watch '+metric(s,'avg_watch_time_seconds')+' s')+'</span><span>'+esc(fmt(interactions(s)))+' int.</span></div>';
    }).join('')+'</div><details><summary>Variables usadas</summary><p><b>Hook:</b> '+esc(piece.hook_verbal||'No registrado')+'</p><p><b>CTA:</b> '+esc(piece.cta_master||'No registrado')+'</p><p><b>Versión:</b> '+esc(scriptVersion(piece))+'</p></details></article>';
  }).join(''):'<p class="muted">Todavía no hay proyectos medidos.</p>')+'</div></section>';
}
function published(m){
  return '<section class="learn-section"><div class="section-head"><div><span>QUÉ PUBLICAMOS</span><h2>Paquete preparado vs publicación real</h2><p>PREPARADO ≠ PUBLICADO. Si faltó el registro histórico, no se inventa.</p></div></div><div class="publish-list">'+(m.pubs.length?m.pubs.map(pub=>{
    const p=pub.piece||{},pack=pub.pack;
    return '<details class="publish-row"><summary><b>'+esc(pub.project)+' · '+esc(P[pub.plataforma])+'</b><span>'+esc(dt(pub.published_at))+'</span>'+pill(pub.package_match_status||'UNKNOWN')+'</summary><div class="trace"><div><span>Guion</span><b>'+esc(scriptVersion(p))+'</b></div><div><span>URL</span><b>'+(pub.url?'<a href="'+esc(pub.url)+'" target="_blank" rel="noopener">Abrir ↗</a>':'No registrada')+'</b></div><div><span>Descripción real</span><pre>'+esc(pub.caption||'No registrada históricamente.')+'</pre></div><div><span>Hashtags reales</span><pre>'+esc(hashtags(pub.hashtags))+'</pre></div><div><span>Paquete CHAT 02</span><pre>'+esc(pack?.caption||'No hay paquete preparado registrado.')+'</pre></div><div><span>Hashtags del paquete</span><pre>'+esc(pack?hashtags(pack.hashtags):'No registrados')+'</pre></div></div><details class="nested"><summary>Ver guion</summary><pre>'+esc(p.master_script||'No disponible')+'</pre></details></details>';
  }).join(''):'<p class="muted">Sin publicaciones registradas.</p>')+'</div></section>';
}
function platforms(m){
  const cards=['TIKTOK','INSTAGRAM','FACEBOOK'].map(p=>{
    const rows=m.latest.filter(x=>x.platform===p),views=rows.reduce((a,x)=>a+(metric(x.metrics,'views')||0),0),ints=rows.reduce((a,x)=>a+interactions(x.metrics),0);
    const watch=rows.length?rows.map(x=>metric(x.metrics,'avg_watch_time_seconds')).filter(x=>x!==null):[];
    const comp=rows.map(x=>metric(x.metrics,'completion_pct')).filter(x=>x!==null);
    const skip=rows.map(x=>metric(x.metrics,'skip_rate_pct')).filter(x=>x!==null);
    return '<article class="platform-card"><div><b>'+esc(P[p])+'</b>'+pill(rows.length+' pub.','platform')+'</div><dl><dt>Views</dt><dd>'+esc(fmt(views))+'</dd><dt>Interacciones</dt><dd>'+esc(fmt(ints))+'</dd><dt>Tiempo visto</dt><dd>'+esc(watch.length?(watch.reduce((a,b)=>a+b,0)/watch.length).toFixed(1)+' s':'—')+'</dd><dt>Vio completo</dt><dd>'+esc(comp.length?pct(comp.reduce((a,b)=>a+b,0)/comp.length):'—')+'</dd><dt>Omitió rápido</dt><dd>'+esc(skip.length?pct(skip.reduce((a,b)=>a+b,0)/skip.length):'—')+'</dd></dl></article>';
  });
  return '<section class="learn-section"><div class="section-head"><div><span>COMPARACIÓN POR PLATAFORMA</span><h2>Comparar sin mezclar métricas incompatibles</h2></div></div><div class="platform-grid">'+cards.join('')+'</div></section>';
}
function evolution(m){
  const by=new Map();m.snaps.forEach(s=>{if(!by.has(s.publication_id))by.set(s.publication_id,[]);by.get(s.publication_id).push(s)});
  const rows=m.pubs.filter(x=>by.has(x.id));
  return '<section class="learn-section"><div class="section-head"><div><span>EVOLUCIÓN</span><h2>T+12h → T+24h → T+72h → T+7d</h2><p>Los snapshots no se sobrescriben.</p></div></div><div class="timeline-list">'+(rows.length?rows.map(pub=>{
    const snaps=by.get(pub.id).sort((a,b)=>new Date(a.snapshot_at)-new Date(b.snapshot_at));
    return '<article><b>'+esc(pub.project)+' · '+esc(P[pub.plataforma])+'</b>'+snaps.map(s=>'<div class="time-point"><i></i><span><b>'+esc(s.snapshot_stage)+'</b> '+esc(dt(s.snapshot_at))+' · '+esc(fmt(metric(s.metrics,'views')))+' views · '+esc(fmt(interactions(s.metrics)))+' int.</span></div>').join('')+'</article>';
  }).join(''):'<p class="muted">Sin evolución suficiente.</p>')+'</div></section>';
}
function audience(m){
  const timeRecs=m.recs.filter(x=>x.dimension==='PUBLISH_TIME');
  const observed=m.pubs.filter(x=>x.published_at).map(x=>{
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:TZ,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(x.published_at)).filter(z=>z.type!=='literal').map(z=>[z.type,z.value]));
    return P[x.plataforma]+' · '+parts.hour+':'+parts.minute+' · '+parts.weekday;
  });
  const cards=['TIKTOK','INSTAGRAM','FACEBOOK'].map(p=>{
    const rows=m.latest.filter(x=>x.platform===p);
    return '<article class="audience-card"><h3>'+esc(P[p])+'</h3><h4>Edad</h4>'+bars(weightedMap(rows,'age_pct'))+'<h4>Género</h4>'+bars(weightedMap(rows,'gender_pct'))+'<h4>Ubicación</h4>'+bars(weightedMap(rows,'locations_pct'))+'<h4>Seguidores / no seguidores</h4>'+bars(weightedMap(rows,'audience_follow_status_pct'))+'<h4>Actividad por hora</h4>'+bars(weightedMap(rows,'activity_by_hour_pct'))+'<h4>Actividad por día</h4>'+bars(weightedMap(rows,'activity_by_day_pct'))+'</article>';
  });
  return '<section class="learn-section"><div class="section-head"><div><span>AUDIENCIA + HORARIOS</span><h2>Quién responde y cuándo</h2><p>Se analiza por plataforma; una sola publicación no define la mejor hora.</p></div></div><div class="audience-grid">'+cards.join('')+'</div><div class="timing-grid"><div><h3>Horas observadas · '+TZ+'</h3><p>'+esc(observed.length?observed.join(' · '):'No registradas')+'</p></div><div><h3>Recomendación</h3>'+(timeRecs.length?timeRecs.slice(0,2).map(r=>'<p>'+pill(EVID[r.evidence_level]||r.evidence_level,r.evidence_level==='INSUFFICIENT'?'warn':'ok')+' '+esc(r.recommendation)+'</p>').join(''):'<p class="muted">Sin evidencia suficiente.</p>')+'</div></div></section>';
}
function variables(m){
  const lib=new Map(m.lib.map(x=>[x.id,x])),counts={HOOK:0,REHOOK:0,CTA:0,FORMAT:0};
  m.perf.forEach(r=>{const t=lib.get(r.library_item_id)?.library_type;if(counts[t]!==undefined)counts[t]++});
  return '<section class="learn-section"><div class="section-head"><div><span>ELEMENTOS DEL CONTENIDO</span><h2>Qué ya puede aprender el sistema</h2></div></div><div class="var-grid">'+Object.entries(counts).map(([k,v])=>stat(k,v,'observaciones vinculadas')).join('')+stat('COPY / HASHTAGS',m.packs.length,m.packs.length?'paquetes versionados':'empezará con las próximas publicaciones de CHAT 02')+'</div></section>';
}
function topList(values,limit=8){
  const map={};values.filter(Boolean).forEach(v=>{map[v]=(map[v]||0)+1});
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,limit);
}
function commentInsights(m){
  const audience=m.comments.filter(x=>!x.is_creator_reply),am=new Map(m.commentAnalysis.map(x=>[x.comment_id,x]));
  const analyzed=audience.map(x=>({comment:x,analysis:am.get(x.id)})).filter(x=>x.analysis);
  const reported=m.latest.reduce((a,x)=>a+(metric(x.metrics,'comments')||0),0);
  const pending=Math.max(0,reported-audience.length);
  const sentiments=topList(analyzed.map(x=>x.analysis.sentiment),6);
  const themes=topList(analyzed.flatMap(x=>x.analysis.themes||[]));
  const liked=topList(analyzed.flatMap(x=>x.analysis.liked_aspects||[]));
  const disliked=topList(analyzed.flatMap(x=>x.analysis.disliked_aspects||[]));
  const language=topList(analyzed.flatMap(x=>x.analysis.language_terms||[]));
  const signalTypes=topList(analyzed.flatMap(x=>x.analysis.signal_types||[]));
  const commentSignals=m.signals.filter(x=>String(x.source||'').toUpperCase().includes('COMMENT'));
  const chips=rows=>rows.length?'<div class="comment-chips">'+rows.map(([k,v])=>'<span><b>'+esc(k)+'</b> × '+esc(v)+'</span>').join('')+'</div>':'<p class="muted">Aún sin muestra suficiente.</p>';
  return '<section class="learn-section"><div class="section-head"><div><span>COMENTARIOS</span><h2>Qué piensa y cómo habla la audiencia</h2><p>El conteo y el texto son datos distintos. El análisis cualitativo usa solo comentarios cuyo texto fue realmente ingerido.</p></div>'+pill(audience.length+' textos','info')+'</div>'+
  '<div class="comment-coverage">'+
    stat('Comentarios reportados',reported||0,'según último snapshot por publicación')+
    stat('Textos ingeridos',audience.length,'sin respuestas de la marca')+
    stat('Analizados',analyzed.length,'clasificación multi-etiqueta')+
    stat('Pendientes de texto',pending,'conteo sin contenido semántico disponible')+
  '</div>'+
  '<div class="comment-grid">'+
    '<article><h3>Sentimiento</h3>'+chips(sentiments)+'</article>'+
    '<article><h3>Temas repetidos</h3>'+chips(themes)+'</article>'+
    '<article><h3>Qué gusta</h3>'+chips(liked)+'</article>'+
    '<article><h3>Qué no gusta</h3>'+chips(disliked)+'</article>'+
    '<article><h3>Señales</h3>'+chips(signalTypes)+'</article>'+
    '<article><h3>Lenguaje de audiencia</h3>'+chips(language)+'</article>'+
  '</div>'+
  '<div class="comment-patterns"><h3>Patrones elevados a señales estratégicas</h3>'+(commentSignals.length?commentSignals.map(s=>'<div><div>'+pill(s.signal_type,'info')+pill('frecuencia '+s.frequency)+'</div><p>'+esc(s.signal_text)+'</p></div>').join(''):'<p class="muted">Todavía no hay patrones de comentarios elevados a content_strategy_signals.</p>')+'</div>'+
  '<div class="comment-list"><h3>Comentarios recientes anonimizados</h3>'+(analyzed.length?analyzed.slice(0,8).map(x=>'<article><div>'+pill(P[x.comment.platform]||x.comment.platform,'platform')+pill(x.analysis.sentiment,x.analysis.sentiment==='NEGATIVE'?'bad':x.analysis.sentiment==='POSITIVE'?'ok':'')+'</div><p>'+esc(x.comment.comment_text)+'</p><small>'+esc(dt(x.comment.commented_at))+(x.analysis.response_priority==='CLINICAL_ATTENTION'?' · PRIORIDAD CLÍNICA':'')+'</small></article>').join(''):'<p class="muted">No hay texto de comentarios disponible todavía. Metricool Analytics aporta conteos, pero el conector actual no expone el contenido del Inbox.</p>')+'</div>'+
  '</section>';
}
function signals(m){
  return '<section class="learn-section"><div class="section-head"><div><span>SEÑALES</span><h2>Preguntas, objeciones y lenguaje</h2></div></div><div class="signal-grid">'+(m.signals.length?m.signals.map(s=>'<article><div>'+pill(s.signal_type,'info')+pill(s.review_status)+'</div><p>'+esc(s.signal_text)+'</p><small>'+esc(s.source||'')+'</small></article>').join(''):'<p class="muted">Sin señales todavía.</p>')+'</div></section>';
}
function hypotheses(m){
  return '<section class="learn-section"><div class="section-head"><div><span>HIPÓTESIS</span><h2>Qué creemos y qué falta demostrar</h2></div></div><div class="hyp-grid">'+(m.hyps.length?m.hyps.map(h=>'<article><div><b>'+esc(key(h.dimension))+'</b>'+pill(HYP[h.status]||h.status,h.status==='INSUFFICIENT'?'warn':h.status==='CONTRADICTING'?'bad':'ok')+'</div><p>'+esc(h.statement)+'</p><small>Muestra: '+esc(h.sample_size)+'</small>'+(h.recommended_test?'<div class="next-test"><b>Siguiente prueba</b><span>'+esc(h.recommended_test)+'</span></div>':'')+'</article>').join(''):'<p class="muted">Sin hipótesis todavía.</p>')+'</div></section>';
}

const UI_ICONS={
  pulse:'<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  eye:'<path d="M2 12s3.7-6 10-6 10 6 10 6-3.7 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/>',
  spark:'<path d="m12 3 1.4 4.1L18 8.5l-4 2.6 1.3 4.4-3.3-2.7-3.3 2.7 1.3-4.4-4-2.6 4.6-1.4L12 3Z"/>',
  click:'<path d="m5 3 7 16 2.2-6.1L20 10 5 3Z"/><path d="m14 14 4 4"/>',
  folder:'<path d="M3 6.5h6l2 2h10v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5Z"/>',
  flask:'<path d="M9 3h6M10 3v5l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 17l-5-9V3"/><path d="M8 14h8"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users:'<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-2a4 4 0 0 0-3-3.7M16 3.3a4 4 0 0 1 0 7.4"/>',
  chat:'<path d="M21 14a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v7Z"/>',
  chart:'<path d="M4 19V9M10 19V5M16 19v-8M22 19V3"/>',
  play:'<path d="m8 5 11 7-11 7V5Z"/>',
  camera:'<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="12" cy="12" r="4"/><path d="M8 5l1.5-2h5L16 5"/>',
  network:'<circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="m8 11 8-4M8 13l8 4"/>',
  wand:'<path d="m15 4 5 5L8 21H3v-5L15 4Z"/><path d="m13 6 5 5M4 4v4M2 6h4M19 15v5M16.5 17.5h5"/>',
  chevron:'<path d="m9 6 6 6-6 6"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>'
};
function uiIcon(name,cls='ui-icon'){return '<svg class="'+esc(cls)+'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(UI_ICONS[name]||UI_ICONS.spark)+'</svg>'}
function brandIcon(platform,cls='brand-platform-icon'){
  const p=String(platform||'').toUpperCase();
  if(p==='INSTAGRAM')return '<svg class="'+esc(cls)+' instagram" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.4" cy="6.7" r="1.1" fill="currentColor" stroke="none"/></svg>';
  if(p==='FACEBOOK')return '<svg class="'+esc(cls)+' facebook" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.7 21v-8h3l.5-3h-3.5V8.1c0-.9.3-1.5 1.7-1.5h1.9V4c-.5-.1-1.5-.2-2.7-.2-2.7 0-4.5 1.6-4.5 4.6V10H7v3h3.1v8h3.6Z" fill="currentColor"/></svg>';
  return '<svg class="'+esc(cls)+' tiktok" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4v10.3a4.5 4.5 0 1 1-3-4.2v2.8a2 2 0 1 0 1 1.8V4h2Z"/><path d="M14 5c.6 2.2 2.1 3.6 4.5 4v2.4c-1.9-.2-3.4-.9-4.5-1.9"/></svg>';
}

let LEARNING_BASE=null;
const LF={range:'all',from:'',to:'',contentId:'',publicationId:'',platform:'',hour:'',age:''};
function localDateKey(v){
  if(!v)return null;
  const d=new Date(v);if(Number.isNaN(d.getTime()))return null;
  return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
}
function pubDateKey(pub){
  if(pub?.published_at)return localDateKey(pub.published_at);
  if(pub?.snap?.metrics?.published_date)return String(pub.snap.metrics.published_date).slice(0,10);
  return localDateKey(pub?.snap?.snapshot_at);
}
function pubHour(pub){
  if(!pub?.published_at)return null;
  return Number(new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',hourCycle:'h23'}).format(new Date(pub.published_at)));
}
function rangeBounds(base){
  const dates=base.pubs.map(pubDateKey).filter(Boolean).sort(),max=dates.at(-1)||new Date().toISOString().slice(0,10);
  if(LF.range==='custom')return {from:LF.from||dates[0]||max,to:LF.to||max};
  const days=LF.range==='7d'?7:LF.range==='30d'?30:null;if(!days)return {from:null,to:null};
  const d=new Date(max+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(days-1));return {from:d.toISOString().slice(0,10),to:max};
}
function hourMatches(h,band){
  if(!band)return true;if(h===null)return false;
  return band==='morning'?h>=6&&h<12:band==='afternoon'?h>=12&&h<18:band==='evening'?h>=18&&h<24:h>=0&&h<6;
}
function scopeMatches(row){
  const scope=row?.scope||{};
  if(LF.contentId){
    const code=LEARNING_BASE?.pm?.get(LF.contentId)?.content_code;
    if(scope.content_code&&scope.content_code!==code)return false;
  }
  if(LF.platform&&Array.isArray(scope.platforms)&&scope.platforms.length&&!scope.platforms.includes(LF.platform))return false;
  return true;
}
function filteredModel(base){
  const {from,to}=rangeBounds(base);
  const pubs=base.pubs.filter(pub=>{
    if(LF.publicationId&&pub.id!==LF.publicationId)return false;
    if(LF.contentId&&pub.content_id!==LF.contentId)return false;
    if(LF.platform&&pub.plataforma!==LF.platform)return false;
    const d=pubDateKey(pub);if(from&&(!d||d<from))return false;if(to&&(!d||d>to))return false;
    if(!hourMatches(pubHour(pub),LF.hour))return false;return true;
  });
  const pubIds=new Set(pubs.map(x=>x.id)),contentIds=new Set(pubs.map(x=>x.content_id));
  const latest=base.latest.filter(x=>pubIds.has(x.publication_id)),snaps=base.snaps.filter(x=>pubIds.has(x.publication_id));
  const signals=base.signals.filter(x=>(!x.publication_id||pubIds.has(x.publication_id))&&(!x.content_id||contentIds.has(x.content_id)));
  const hyps=base.hyps.filter(scopeMatches),recs=base.recs.filter(scopeMatches);
  const perf=base.perf.filter(x=>(!x.publication_id||pubIds.has(x.publication_id))&&(!x.content_id||contentIds.has(x.content_id)));
  const comments=base.comments.filter(x=>!x.publication_id||pubIds.has(x.publication_id)),commentIds=new Set(comments.map(x=>x.id));
  const commentAnalysis=base.commentAnalysis.filter(x=>commentIds.has(x.comment_id));
  return {...base,pubs,latest,snaps,signals,hyps,recs,perf,comments,commentAnalysis};
}
function filterLabel(){
  const parts=[];
  if(LF.range==='7d')parts.push('Últimos 7 días');else if(LF.range==='30d')parts.push('Últimos 30 días');else if(LF.range==='custom')parts.push((LF.from||'…')+' → '+(LF.to||'…'));
  if(LF.contentId)parts.push(LEARNING_BASE?.pm?.get(LF.contentId)?.titulo||'Video');
  if(LF.publicationId){const pub=LEARNING_BASE?.pubs?.find(x=>x.id===LF.publicationId);if(pub)parts.push((P[pub.plataforma]||pub.plataforma)+' · '+(pubDateKey(pub)||''))}
  if(LF.platform)parts.push(P[LF.platform]||LF.platform);
  if(LF.hour)parts.push({morning:'Mañana',afternoon:'Tarde',evening:'Noche',night:'Madrugada'}[LF.hour]);
  if(LF.age)parts.push('Edad '+labelKey(LF.age));
  return parts.length?parts.join(' · '):'Todo el historial disponible';
}
function filterBar(base,filtered){
  const projects=[...new Set(base.pubs.map(x=>x.content_id))].map(id=>base.pm.get(id)).filter(Boolean).sort((a,b)=>(a.content_num||0)-(b.content_num||0));
  const ages=[...new Set(base.latest.flatMap(x=>Object.keys(x.audience?.age_pct||{})))];
  const {from,to}=rangeBounds(base);
  return '<section class="filter-panel"><div class="filter-panel-head"><div><span class="premium-kicker">FILTRAR RESULTADOS</span><h2>Busca por fecha, video, red, hora o edad</h2><p>'+esc(filterLabel())+'</p></div><div class="filter-count"><b>'+esc(filtered.pubs.length)+'</b><span>publicaciones visibles</span></div></div>'+
  '<div class="filter-grid">'+
    '<label><span>Periodo</span><select data-lf="range"><option value="all" '+(LF.range==='all'?'selected':'')+'>Todo</option><option value="7d" '+(LF.range==='7d'?'selected':'')+'>Últimos 7 días</option><option value="30d" '+(LF.range==='30d'?'selected':'')+'>Últimos 30 días</option><option value="custom" '+(LF.range==='custom'?'selected':'')+'>Elegir fechas</option></select></label>'+
    '<label class="filter-date '+(LF.range==='custom'?'show':'')+'"><span>Desde</span><input type="date" data-lf="from" value="'+esc(LF.from||from||'')+'"></label>'+
    '<label class="filter-date '+(LF.range==='custom'?'show':'')+'"><span>Hasta</span><input type="date" data-lf="to" value="'+esc(LF.to||to||'')+'"></label>'+
    '<label><span>Video</span><select data-lf="contentId"><option value="">Todos los videos</option>'+projects.map(p=>'<option value="'+esc(p.id)+'" '+(LF.contentId===p.id?'selected':'')+'>'+esc(projectLabel(projectNum(p,base.lm))+' · '+(p.titulo||p.content_code))+'</option>').join('')+'</select></label>'+
    '<label><span>Publicación concreta</span><select data-lf="publicationId"><option value="">Todas las publicaciones</option>'+base.pubs.map(pub=>'<option value="'+esc(pub.id)+'" '+(LF.publicationId===pub.id?'selected':'')+'>'+esc(pub.project+' · '+(P[pub.plataforma]||pub.plataforma)+' · '+(pubDateKey(pub)||'sin fecha'))+'</option>').join('')+'</select></label>'+
    '<label><span>Hora de publicación</span><select data-lf="hour"><option value="">Todas las horas</option><option value="morning" '+(LF.hour==='morning'?'selected':'')+'>Mañana · 06–12</option><option value="afternoon" '+(LF.hour==='afternoon'?'selected':'')+'>Tarde · 12–18</option><option value="evening" '+(LF.hour==='evening'?'selected':'')+'>Noche · 18–24</option><option value="night" '+(LF.hour==='night'?'selected':'')+'>Madrugada · 00–06</option></select></label>'+
    '<label><span>Edad en audiencia</span><select data-lf="age"><option value="">Todas las edades</option>'+ages.map(a=>'<option value="'+esc(a)+'" '+(LF.age===a?'selected':'')+'>'+esc(labelKey(a))+'</option>').join('')+'</select></label>'+
  '</div>'+
  '<div class="platform-filter"><span>Red social</span><div><button type="button" data-platform-filter="" class="'+(!LF.platform?'active':'')+'">'+uiIcon('chart','filter-all-icon')+'Todas</button>'+['TIKTOK','INSTAGRAM','FACEBOOK'].map(p=>'<button type="button" data-platform-filter="'+p+'" class="'+(LF.platform===p?'active':'')+'">'+brandIcon(p,'filter-brand-icon')+esc(P[p])+'</button>').join('')+'</div><button type="button" class="filter-reset" data-filter-reset>Limpiar filtros</button></div>'+
  (LF.age?'<div class="filter-note">'+uiIcon('users')+'<span>La edad cambia solo el bloque de audiencia; las redes no entregan las visualizaciones totales separadas por edad en este corte.</span></div>':'')+
  '</section>';
}
function bindFilters(){
  document.querySelectorAll('[data-lf]').forEach(el=>el.addEventListener('change',()=>{LF[el.dataset.lf]=el.value;if(el.dataset.lf==='range'&&el.value!=='custom'){LF.from='';LF.to=''}renderLearning()}));
  document.querySelectorAll('[data-platform-filter]').forEach(btn=>btn.addEventListener('click',()=>{LF.platform=btn.dataset.platformFilter||'';renderLearning()}));
  document.querySelector('[data-filter-reset]')?.addEventListener('click',()=>{Object.assign(LF,{range:'all',from:'',to:'',contentId:'',publicationId:'',platform:'',hour:'',age:''});renderLearning()});
}
function renderLearning(){
  if(!LEARNING_BASE)return;const m=filteredModel(LEARNING_BASE);
  root().innerHTML=filterBar(LEARNING_BASE,m)+executiveOverview(m)+actionDeck(m)+projectSpotlight(m)+platformComparisonPremium(m)+audienceExplorer(m)+creativePremium(m)+voicePremium(m)+evidencePremium(m)+deepDivePremium(m);
  bindFilters();bindPremiumInteractions();
}

function labelKey(v){
  const map={women:'Mujeres',men:'Hombres',other:'Otro',unknown:'Desconocido',followers:'Seguidores',non_followers:'No seguidores',Peru:'Perú',Italy:'Italia',Spain:'España',United_States:'Estados Unidos',Canada:'Canadá',Argentina:'Argentina','18_24':'18–24','25_34':'25–34','35_44':'35–44','45_54':'45–54','55_plus':'55+'};
  return map[v]||key(v);
}
function premiumBars(map){
  const items=Object.entries(map||{}).slice(0,6);
  if(!items.length)return '<div class="premium-empty mini">'+uiIcon('chart')+'<span>Sin datos disponibles en este corte.</span></div>';
  const max=Math.max(...items.map(x=>Number(x[1])||0),1);
  return '<div class="premium-bars">'+items.map(([k,v])=>'<div class="premium-bar"><div><span>'+esc(labelKey(k))+'</span><b>'+esc(pct(v))+'</b></div><i><em style="width:'+Math.max(2,(Number(v)||0)/max*100)+'%"></em></i></div>').join('')+'</div>';
}
function premiumKpi(iconName,label,value,note,tone=''){
  return '<article class="premium-kpi '+esc(tone)+'"><div class="kpi-icon">'+uiIcon(iconName)+'</div><div><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(note||'')+'</small></div></article>';
}
function latestSnapshotAt(m){
  const dates=m.latest.map(x=>x.snapshot_at).filter(Boolean).sort();
  return dates.length?dates.at(-1):null;
}
function executiveOverview(m){
  const views=m.latest.reduce((a,x)=>a+(metric(x.metrics,'views')||0),0);
  const ints=m.latest.reduce((a,x)=>a+interactions(x.metrics),0);
  const clicks=m.latest.reduce((a,x)=>a+(metric(x.metrics,'clicks')||0),0);
  const publishedCount=m.pubs.filter(x=>x.estado==='PUBLISHED').length;
  const projects=new Set(m.latest.map(x=>x.content_id)).size;
  const comments=m.comments.filter(x=>!x.is_creator_reply).length;
  const stamp=latestSnapshotAt(m);
  return '<section id="overview" class="premium-section executive-overview">'+
    '<div class="overview-hero"><div class="overview-mark">'+uiIcon('pulse')+'</div><div><span class="premium-kicker">RESUMEN</span><h2>Resumen del rendimiento</h2><p>'+esc(projects?projects+' proyecto'+(projects===1?'':'s')+' con medición propia. Los detalles técnicos quedan debajo, bajo demanda.':'Todavía no hay proyectos medidos para este negocio.')+'</p></div><div class="overview-meta"><b>'+esc(m.snaps.length)+' cortes de métricas</b><span>'+(stamp?'Actualizado '+esc(dt(stamp)):'Sin corte registrado')+'</span></div></div>'+
    '<div class="premium-kpi-grid">'+
      premiumKpi('eye','Visualizaciones',fmt(views),'última lectura por red','blue')+
      premiumKpi('spark','Interacciones',fmt(ints),'según definición de cada plataforma','violet')+
      premiumKpi('click','Clics',fmt(clicks),'cuando la plataforma los expone','cyan')+
      premiumKpi('play','Publicaciones',publishedCount,'registros reales por plataforma','green')+
      premiumKpi('folder','Videos medidos',projects,'con al menos un snapshot','amber')+
      premiumKpi('chat','Comentarios con texto',comments,'voz de audiencia realmente ingerida','rose')+
    '</div></section>';
}
function recTone(level){return level==='INSUFFICIENT'?'warn':level==='CONTROLLED_TEST'?'strong':'ok'}
function actionDeck(m){
  const daily=m.recs.filter(x=>x.period_type==='DAILY').slice(0,3);
  const fallback=m.recs.filter(x=>x.period_type!=='DAILY').slice(0,3);
  const rows=daily.length?daily:fallback;
  const all=m.recs;
  return '<section id="actions" class="premium-section">'+
    '<div class="premium-head"><div><span class="premium-kicker">SIGUIENTE MOVIMIENTO</span><h2>Qué hacer ahora</h2><p>Acciones priorizadas; la justificación completa aparece solo al abrir cada tarjeta.</p></div>'+pill(rows.length+' prioridades','info')+'</div>'+
    '<div class="action-grid">'+(rows.length?rows.map((r,i)=>'<article class="action-card priority-'+(i+1)+'"><div class="action-top"><span class="action-rank">'+(i+1)+'</span><div><small>'+esc(key(r.dimension))+'</small><h3>'+esc(r.recommendation)+'</h3></div></div><div class="action-foot">'+pill(EVID[r.evidence_level]||r.evidence_level,recTone(r.evidence_level))+'<span>Datos usados: '+esc(r.sample_size)+'</span></div><details><summary>Por qué</summary><p>'+esc(r.reasoning_summary||'Sin razonamiento adicional registrado.')+'</p></details></article>').join(''):'<div class="premium-empty">'+uiIcon('wand')+'<div><b>Sin recomendación todavía</b><span>El sistema necesita más observaciones antes de proponer una acción.</span></div></div>')+'</div>'+
    (all.length>rows.length?'<details class="more-drawer"><summary>Ver todas las recomendaciones</summary><div class="drawer-list">'+all.map(r=>'<article><div><b>'+esc(PERIOD[r.period_type]||r.period_type)+' · '+esc(key(r.dimension))+'</b>'+pill(EVID[r.evidence_level]||r.evidence_level,recTone(r.evidence_level))+'</div><p>'+esc(r.recommendation)+'</p><small>'+esc(r.reasoning_summary||'')+' · muestra '+esc(r.sample_size)+'</small></article>').join('')+'</div></details>':'')+
  '</section>';
}
function projectSpotlight(m){
  const ids=[...new Set(m.latest.map(x=>x.content_id))];
  return '<section id="projects" class="premium-section">'+
    '<div class="premium-head"><div><span class="premium-kicker">VIDEOS MEDIDOS</span><h2>Video + resultado</h2><p>Una tarjeta por pieza. Lo que se ejecutó queda unido a lo que se midió.</p></div></div>'+
    '<div class="project-focus-grid">'+(ids.length?ids.map(id=>{
      const piece=m.pm.get(id);if(!piece)return '';
      const pn=projectLabel(projectNum(piece,m.lm)),pubs=m.pubs.filter(x=>x.content_id===id);
      const totalViews=pubs.reduce((a,p)=>a+(metric(p.snap?.metrics,'views')||0),0);
      return '<article class="project-focus"><div class="project-focus-main"><div class="project-symbol">'+uiIcon('folder')+'</div><div><span>'+esc(pn)+'</span><h3>'+esc(piece.titulo||piece.content_code)+'</h3><p>'+esc(piece.servicio)+' · '+esc(piece.formato||'Formato no registrado')+'</p></div><div class="project-total"><b>'+esc(fmt(totalViews))+'</b><small>views observadas</small></div></div><div class="platform-strip">'+pubs.map(pub=>{const mm=pub.snap?.metrics||{};return '<div class="platform-chip platform-'+String(pub.plataforma||'').toLowerCase()+'"><b>'+esc(P[pub.plataforma])+'</b><span>'+esc(fmt(metric(mm,'views')))+' views</span><span>'+esc(fmt(interactions(mm)))+' int.</span></div>'}).join('')+'</div><details class="project-details"><summary>Ver variables creativas</summary><div class="detail-facts"><p><b>Hook</b><span>'+esc(piece.hook_verbal||'No registrado')+'</span></p><p><b>CTA</b><span>'+esc(piece.cta_master||'No registrado')+'</span></p><p><b>Versión</b><span>'+esc(scriptVersion(piece))+'</span></p></div></details></article>';
    }).join(''):'<div class="premium-empty">'+uiIcon('folder')+'<div><b>Sin proyectos medidos</b><span>Cuando exista al menos un snapshot aparecerá aquí.</span></div></div>')+'</div></section>';
}
function platformComparisonPremium(m){
  const platforms=['TIKTOK','INSTAGRAM','FACEBOOK'];
  const maxViews=Math.max(...platforms.map(p=>m.latest.filter(x=>x.platform===p).reduce((a,x)=>a+(metric(x.metrics,'views')||0),0)),1);
  return '<section id="platforms" class="premium-section">'+
    '<div class="premium-head"><div><span class="premium-kicker">REDES SOCIALES</span><h2>Compara cada red por separado</h2><p>No se mezclan definiciones incompatibles: cada tarjeta muestra solo lo que esa plataforma expone.</p></div></div>'+
    '<div class="platform-premium-grid">'+platforms.map(p=>{
      const rows=m.latest.filter(x=>x.platform===p),views=rows.reduce((a,x)=>a+(metric(x.metrics,'views')||0),0),ints=rows.reduce((a,x)=>a+interactions(x.metrics),0);
      const watch=rows.map(x=>metric(x.metrics,'avg_watch_time_seconds')).filter(x=>x!==null);
      const comp=rows.map(x=>metric(x.metrics,'completion_pct')).filter(x=>x!==null);
      const skip=rows.map(x=>metric(x.metrics,'skip_rate_pct')).filter(x=>x!==null);
      const nonf=rows.map(x=>metric(x.audience?.audience_follow_status_pct,'non_followers')).filter(x=>x!==null);
      const signal=nonf.length?('No seguidores '+pct(nonf.reduce((a,b)=>a+b,0)/nonf.length)):skip.length?('Omisión '+pct(skip.reduce((a,b)=>a+b,0)/skip.length)):ints?fmt(ints)+' interacciones':'Sin señal adicional';
      return '<article class="platform-premium platform-'+p.toLowerCase()+'"><div class="platform-title"><span class="platform-brand-wrap">'+brandIcon(p,'platform-brand-icon')+'</span><div><b>'+esc(P[p])+'</b><small>'+esc(rows.length)+' publicación'+(rows.length===1?'':'es')+'</small></div></div><div class="platform-primary"><strong>'+esc(fmt(views))+'</strong><span>views</span></div><div class="platform-meter"><i style="width:'+Math.max(4,views/maxViews*100)+'%"></i></div><dl><div><dt>Interacciones</dt><dd>'+esc(fmt(ints))+'</dd></div><div><dt>Tiempo visto</dt><dd>'+esc(watch.length?(watch.reduce((a,b)=>a+b,0)/watch.length).toFixed(1)+' s':'—')+'</dd></div><div><dt>Vio completo</dt><dd>'+esc(comp.length?pct(comp.reduce((a,b)=>a+b,0)/comp.length):'—')+'</dd></div><div><dt>Omitió rápido</dt><dd>'+esc(skip.length?pct(skip.reduce((a,b)=>a+b,0)/skip.length):'—')+'</dd></div></dl><div class="platform-signal">'+uiIcon('pulse')+'<span>'+esc(signal)+'</span></div></article>';
    }).join('')+'</div></section>';
}
function audienceExplorer(m){
  const observed=m.pubs.filter(x=>x.published_at).map(x=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:TZ,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(x.published_at)).filter(z=>z.type!=='literal').map(z=>[z.type,z.value]));return (P[x.plataforma]||x.plataforma)+' · '+parts.hour+':'+parts.minute});
  const timeRec=m.recs.find(x=>x.dimension==='PUBLISH_TIME');
  const panels=['TIKTOK','INSTAGRAM','FACEBOOK'].map((p,i)=>{
    const rows=m.latest.filter(x=>x.platform===p);
    let age=weightedMap(rows,'age_pct');if(LF.age)age=age[LF.age]!==undefined?{[LF.age]:age[LF.age]}:{};const gender=weightedMap(rows,'gender_pct'),loc=weightedMap(rows,'locations_pct'),follow=weightedMap(rows,'audience_follow_status_pct');
    return '<div class="audience-panel '+(i===0?'active':'')+'" data-audience-panel="'+p+'"><div class="audience-columns"><article><h3>Edad</h3>'+premiumBars(age)+'</article><article><h3>Género</h3>'+premiumBars(gender)+'</article><article><h3>Ubicación</h3>'+premiumBars(loc)+'</article><article><h3>Seguidores</h3>'+premiumBars(follow)+'</article></div></div>';
  }).join('');
  return '<section id="audience" class="premium-section"><div class="premium-head"><div><span class="premium-kicker">AUDIENCIA + HORARIOS</span><h2>Quién respondió</h2><p>Explora una plataforma a la vez para no mezclar poblaciones distintas.</p></div></div><div class="audience-tabs">'+['TIKTOK','INSTAGRAM','FACEBOOK'].map((p,i)=>'<button type="button" class="'+(i===0?'active':'')+'" data-audience-tab="'+p+'">'+esc(P[p])+'</button>').join('')+'</div>'+panels+'<div class="timing-premium"><div>'+uiIcon('clock')+'<div><b>Horas observadas</b><span>'+esc(observed.length?observed.join(' · '):'No registradas')+' · '+esc(TZ)+'</span></div></div><div>'+pill(timeRec?EVID[timeRec.evidence_level]||timeRec.evidence_level:'Sin evidencia',timeRec?recTone(timeRec.evidence_level):'warn')+'<span>'+esc(timeRec?.recommendation||'Aún no hay una recomendación horaria sustentada.')+'</span></div></div></section>';
}
function creativePremium(m){
  const lib=new Map(m.lib.map(x=>[x.id,x])),counts={HOOK:0,REHOOK:0,CTA:0,FORMAT:0};
  m.perf.forEach(r=>{const t=lib.get(r.library_item_id)?.library_type;if(counts[t]!==undefined)counts[t]++});
  const cards=[
    ['HOOK','Inicio del video','wand',counts.HOOK],
    ['REHOOK','Recordatorios de atención','pulse',counts.REHOOK],
    ['CTA','CTA','click',counts.CTA],
    ['FORMAT','Formato','chart',counts.FORMAT],
    ['COPY','Descripción / hashtags','chat',m.packs.length]
  ];
  return '<section id="creative" class="premium-section"><div class="premium-head"><div><span class="premium-kicker">ELEMENTOS DEL CONTENIDO</span><h2>Qué parte del contenido estamos midiendo</h2><p>Observaciones vinculadas; cero no significa que una variable sea mala, sino que todavía no está medida.</p></div></div><div class="creative-premium-grid">'+cards.map(([k,label,ico,v])=>'<article class="creative-card"><span>'+uiIcon(ico)+'</span><div><small>'+esc(k)+'</small><b>'+esc(v)+'</b><p>'+esc(label)+'</p></div></article>').join('')+'</div></section>';
}
function voicePremium(m){
  const audience=m.comments.filter(x=>!x.is_creator_reply),am=new Map(m.commentAnalysis.map(x=>[x.comment_id,x]));
  const analyzed=audience.map(x=>({comment:x,analysis:am.get(x.id)})).filter(x=>x.analysis);
  const reported=m.latest.reduce((a,x)=>a+(metric(x.metrics,'comments')||0),0),pending=Math.max(0,reported-audience.length);
  const themes=topList(analyzed.flatMap(x=>x.analysis.themes||[]),6),language=topList(analyzed.flatMap(x=>x.analysis.language_terms||[]),6),signals=topList(analyzed.flatMap(x=>x.analysis.signal_types||[]),6);
  const chipList=rows=>rows.length?'<div class="voice-chips">'+rows.map(([k,v])=>'<span>'+esc(k)+' <b>'+esc(v)+'</b></span>').join('')+'</div>':'<span class="voice-none">Sin muestra suficiente.</span>';
  return '<section id="voice" class="premium-section"><div class="premium-head"><div><span class="premium-kicker">VOZ DE AUDIENCIA</span><h2>Comentarios, objeciones y lenguaje</h2><p>Solo se analiza semántica cuando existe texto real del comentario.</p></div>'+pill(audience.length+' textos','info')+'</div>'+
    '<div class="voice-summary">'+premiumKpi('chat','Reportados',reported||0,'conteo de plataforma')+premiumKpi('chat','Textos ingeridos',audience.length,'comentarios disponibles')+premiumKpi('spark','Analizados',analyzed.length,'clasificación cualitativa')+premiumKpi('clock','Pendientes',pending,'conteo sin texto')+'</div>'+
    (analyzed.length?'<div class="voice-grid"><article><h3>Temas</h3>'+chipList(themes)+'</article><article><h3>Señales</h3>'+chipList(signals)+'</article><article><h3>Lenguaje real</h3>'+chipList(language)+'</article></div>':'<div class="premium-empty voice-empty">'+uiIcon('chat')+'<div><b>Aún no hay texto de comentarios</b><span>El conteo puede existir, pero no se inventan objeciones, deseos o lenguaje sin contenido real.</span></div></div>')+
    (analyzed.length?'<details class="more-drawer"><summary>Ver comentarios recientes anonimizados</summary><div class="comment-list">'+analyzed.slice(0,8).map(x=>'<article><div>'+pill(P[x.comment.platform]||x.comment.platform,'platform')+pill(x.analysis.sentiment,x.analysis.sentiment==='NEGATIVE'?'bad':x.analysis.sentiment==='POSITIVE'?'ok':'')+'</div><p>'+esc(x.comment.comment_text)+'</p><small>'+esc(dt(x.comment.commented_at))+'</small></article>').join('')+'</div></details>':'')+
  '</section>';
}
function evidencePremium(m){
  return '<section id="hypotheses" class="premium-section"><div class="premium-head"><div><span class="premium-kicker">APRENDIZAJE</span><h2>Qué vimos y qué vamos a comprobar</h2><p>Señales e hipótesis separadas de las conclusiones definitivas.</p></div></div><div class="evidence-columns"><div><h3 class="evidence-title">'+uiIcon('pulse')+' Lo que vimos</h3><div class="evidence-list">'+(m.signals.length?m.signals.slice(0,6).map(s=>'<article><div>'+pill(s.signal_type,'info')+pill(s.review_status)+'</div><p>'+esc(s.signal_text)+'</p><small>'+esc(s.source||'')+'</small></article>').join(''):'<div class="premium-empty mini">Sin señales todavía.</div>')+'</div></div><div><h3 class="evidence-title">'+uiIcon('flask')+' Lo que vamos a comprobar</h3><div class="evidence-list">'+(m.hyps.length?m.hyps.map(h=>'<article class="hypothesis-premium"><div><b>'+esc(key(h.dimension))+'</b>'+pill(HYP[h.status]||h.status,h.status==='INSUFFICIENT'?'warn':h.status==='CONTRADICTING'?'bad':'ok')+'</div><p>'+esc(h.statement)+'</p><div class="hyp-meta"><span>Datos usados: '+esc(h.sample_size)+'</span></div>'+(h.recommended_test?'<details><summary>Siguiente prueba</summary><p>'+esc(h.recommended_test)+'</p></details>':'')+'</article>').join(''):'<div class="premium-empty mini">Sin hipótesis todavía.</div>')+'</div></div></div></section>';
}
function deepDivePremium(m){
  const by=new Map();m.snaps.forEach(s=>{if(!by.has(s.publication_id))by.set(s.publication_id,[]);by.get(s.publication_id).push(s)});
  const evolutionRows=m.pubs.filter(x=>by.has(x.id));
  return '<section id="details" class="premium-section detail-zone"><div class="premium-head"><div><span class="premium-kicker">DETALLE</span><h2>Datos completos</h2><p>Disponible cuando necesitas rastrear publicación, snapshots, copy o guion.</p></div></div>'+
    '<details class="audit-drawer"><summary>'+uiIcon('clock')+' Cómo cambiaron las métricas <span>T+12h · T+24h · T+72h · T+7d</span></summary><div class="timeline-list">'+(evolutionRows.length?evolutionRows.map(pub=>{const snaps=by.get(pub.id).sort((a,b)=>new Date(a.snapshot_at)-new Date(b.snapshot_at));return '<article><b>'+esc(pub.project)+' · '+esc(P[pub.plataforma])+'</b>'+snaps.map(s=>'<div class="time-point"><i></i><span><b>'+esc(s.snapshot_stage)+'</b> '+esc(dt(s.snapshot_at))+' · '+esc(fmt(metric(s.metrics,'views')))+' views · '+esc(fmt(interactions(s.metrics)))+' int.</span></div>').join('')+'</article>'}).join(''):'<p class="muted">Sin evolución suficiente.</p>')+'</div></details>'+
    '<details class="audit-drawer"><summary>'+uiIcon('folder')+' Texto preparado vs publicado <span>'+esc(m.pubs.length)+' registros</span></summary><div class="publish-list">'+(m.pubs.length?m.pubs.map(pub=>{const p=pub.piece||{},pack=pub.pack;return '<details class="publish-row"><summary><b>'+esc(pub.project)+' · '+esc(P[pub.plataforma])+'</b><span>'+esc(dt(pub.published_at))+'</span>'+pill(pub.package_match_status||'Sin paquete previo')+'</summary><div class="trace"><div><span>Guion</span><b>'+esc(scriptVersion(p))+'</b></div><div><span>URL</span><b>'+(pub.url?'<a href="'+esc(pub.url)+'" target="_blank" rel="noopener">Abrir ↗</a>':'No registrada')+'</b></div><div><span>Descripción real</span><pre>'+esc(pub.caption||'No registrada históricamente.')+'</pre></div><div><span>Hashtags reales</span><pre>'+esc(hashtags(pub.hashtags))+'</pre></div><div><span>Paquete CHAT 02</span><pre>'+esc(pack?.caption||'No hay paquete preparado registrado.')+'</pre></div><div><span>Hashtags del paquete</span><pre>'+esc(pack?hashtags(pack.hashtags):'No registrados')+'</pre></div></div></details>'}).join(''):'<p class="muted">Sin publicaciones registradas.</p>')+'</div></details></section>';
}
function bindPremiumInteractions(){
  document.querySelectorAll('[data-audience-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    const p=btn.dataset.audienceTab;
    document.querySelectorAll('[data-audience-tab]').forEach(x=>x.classList.toggle('active',x===btn));
    document.querySelectorAll('[data-audience-panel]').forEach(x=>x.classList.toggle('active',x.dataset.audiencePanel===p));
  }));
  const links=[...document.querySelectorAll('.learning-section-nav a[href^="#"]')];
  const sections=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if('IntersectionObserver' in window&&sections.length){
    const obs=new IntersectionObserver(entries=>{
      const visible=entries.filter(x=>x.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+visible.target.id));
    },{rootMargin:'-18% 0px -68% 0px',threshold:[0,.15,.35]});
    sections.forEach(s=>obs.observe(s));
  }
}

function render(m){LEARNING_BASE=m;renderLearning()}
async function boot(){try{root().innerHTML='<div class="loading">Cargando resultados…</div>';render(model(await loadData()))}catch(e){console.error(e);root().innerHTML='<div class="error"><b>No se pudo cargar Aprendizaje V2.</b><br>'+esc(e?.message||e)+'</div>'}}
boot();
