import {sb,resolveContentContext} from '../content-vault-client.js?v=20260919-learning-v2';

const TZ='America/Lima';
const P={TIKTOK:'TikTok',INSTAGRAM:'Instagram',FACEBOOK:'Facebook'};
const PERIOD={DAILY:'Día',WEEKLY:'Semana',MONTHLY:'Mes',YEARLY:'Año',ROLLING:'Rolling'};
const EVID={INSUFFICIENT:'Muestra insuficiente',EXPLORATORY:'Exploratorio',REPEATED_OBSERVATION:'Observación repetida',CONTROLLED_TEST:'Test controlado'};
const HYP={INSUFFICIENT:'Insuficiente',EARLY_SIGNAL:'Señal inicial',SUPPORTING:'A favor',MIXED:'Mixta',CONTRADICTING:'En contra',RETIRED:'Retirada'};
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
    stat('Proyectos medidos',new Set(m.latest.map(x=>x.content_id)).size,'con al menos un snapshot')+
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
    return '<article class="platform-card"><div><b>'+esc(P[p])+'</b>'+pill(rows.length+' pub.','platform')+'</div><dl><dt>Views</dt><dd>'+esc(fmt(views))+'</dd><dt>Interacciones</dt><dd>'+esc(fmt(ints))+'</dd><dt>Watch prom.</dt><dd>'+esc(watch.length?(watch.reduce((a,b)=>a+b,0)/watch.length).toFixed(1)+' s':'—')+'</dd><dt>Finalización</dt><dd>'+esc(comp.length?pct(comp.reduce((a,b)=>a+b,0)/comp.length):'—')+'</dd><dt>Skip</dt><dd>'+esc(skip.length?pct(skip.reduce((a,b)=>a+b,0)/skip.length):'—')+'</dd></dl></article>';
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
  return '<section class="learn-section"><div class="section-head"><div><span>VARIABLES CREATIVAS</span><h2>Qué ya puede aprender el sistema</h2></div></div><div class="var-grid">'+Object.entries(counts).map(([k,v])=>stat(k,v,'observaciones vinculadas')).join('')+stat('COPY / HASHTAGS',m.packs.length,m.packs.length?'paquetes versionados':'empezará con las próximas publicaciones de CHAT 02')+'</div></section>';
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
function render(m){root().innerHTML=summary(m)+recommendations(m)+projects(m)+published(m)+platforms(m)+evolution(m)+audience(m)+variables(m)+commentInsights(m)+signals(m)+hypotheses(m)}
async function boot(){try{root().innerHTML='<div class="loading">Recuperando publicaciones, snapshots, audiencia e hipótesis…</div>';render(model(await loadData()))}catch(e){console.error(e);root().innerHTML='<div class="error"><b>No se pudo cargar Aprendizaje V2.</b><br>'+esc(e?.message||e)+'</div>'}}
boot();
