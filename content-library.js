import {sb,resolveContentContext,normalizeContentPayload,logoutContentVault} from './content-vault-client.js';
import {model,fields,filterItems,related,safeUrl,validatePackage,sha256} from './content-library-model.mjs';

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const norm=v=>String(v??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
let ctx,items=[],filtered=[],view='cards',draft=null,current=null,ready=false,firstOptions=true;
const params=new URLSearchParams(location.search),filterKeys=['q',...Object.keys(fields),'from','to'];
const notify=text=>{$('notice').textContent=text;$('notice').hidden=false;setTimeout(()=>$('notice').hidden=true,5000)};
const stamp=s=>s?new Date(s).toLocaleString('es-PE',{timeZone:'America/Lima',dateStyle:'medium',timeStyle:'short'}):'No registrada';
const secondary=v=>norm(v)==='sin clasificar'||norm(v)==='sin registrar'||norm(v)==='no registrada';

const SERVICE_COLORS={
  'id-s1':['#15803d','#ecfdf3','#166534'],
  'id-s2':['#2563eb','#eff6ff','#1d4ed8'],
  'id-s3':['#7c3aed','#f5f3ff','#6d28d9'],
  'prp facial':['#e11d48','#fff1f2','#be123c'],
  'toxina botulinica':['#db2777','#fdf2f8','#be185d'],
  'hydrafacial / limpieza con aparatologia':['#0891b2','#ecfeff','#0e7490'],
  'liposuccion de papada':['#ea580c','#fff7ed','#c2410c'],
  'bichectomia':['#ca8a04','#fefce8','#a16207']
};
function servicePalette(service){
  const key=norm(service);
  const fixed=SERVICE_COLORS[key];
  if(fixed)return fixed;
  if(key.includes('agenda'))return SERVICE_COLORS['id-s1'];
  if(key.includes('web')||key.includes('landing'))return SERVICE_COLORS['id-s2'];
  if(key.includes('autorreserva')||key.includes('reserva'))return SERVICE_COLORS['id-s3'];
  let hash=0;for(const ch of key)hash=(hash*31+ch.charCodeAt(0))>>>0;
  const hue=hash%360;
  return [`hsl(${hue} 68% 43%)`,`hsl(${hue} 72% 96%)`,`hsl(${hue} 62% 31%)`];
}
function serviceVars(service){const [accent,soft,ink]=servicePalette(service);return `--service-accent:${accent};--service-soft:${soft};--service-ink:${ink}`}
function stateClass(state){return `state-${String(state||'').replace(/[^A-Z0-9_-]/gi,'-')}`}
function valueClass(value){return secondary(value)?'is-secondary':''}
function factCards(pairs){return '<div class="fact-grid">'+pairs.map(([k,v])=>`<div class="fact-card ${valueClass(v)}"><small>${esc(k)}</small><b>${esc(v||'Sin registrar')}</b></div>`).join('')+'</div>'}
function chip(text,extra=''){return `<span class="chip ${secondary(text)?'is-secondary':''} ${extra}">${esc(text||'Sin clasificar')}</span>`}
function sourceBadge(source){const n=norm(source?.evidence_type);if(n.includes('oficial'))return 'OFICIAL';if(n.includes('audiencia'))return 'SEÑAL DE AUDIENCIA';if(n.includes('interna'))return 'INTERNA';return 'FUENTE'}

const AUDIT_FIELDS=[
  ['hook','Hook'],['identificacion','Identificación'],['promesa','Promesa'],['desarrollo','Desarrollo'],
  ['progresion','Progresión'],['payoff','Payoff'],['cierre','Cierre'],['naturalidad','Naturalidad']
];
function parseAudit(summary){
  if(!summary)return {status:'',scores:[],raw:''};
  if(typeof summary==='object'&&!Array.isArray(summary)){
    const scores=AUDIT_FIELDS.map(([key,label])=>{
      const aliases={identificacion:['identification'],promesa:['promise'],desarrollo:['development'],progresion:['progression'],cierre:['closing'],naturalidad:['naturalness']};
      let value=summary[key];for(const a of aliases[key]||[])if(value==null)value=summary[a];
      const n=Number(value);return Number.isFinite(n)?{key,label,value:Math.max(0,Math.min(100,n))}:null;
    }).filter(Boolean);
    return {status:String(summary.status||''),scores,raw:''};
  }
  const raw=String(summary),normalized=norm(raw);
  const scores=AUDIT_FIELDS.map(([key,label])=>{const m=normalized.match(new RegExp(`${key}\\s+(\\d{1,3})`));return m?{key,label,value:Math.max(0,Math.min(100,Number(m[1])))}:null}).filter(Boolean);
  return {status:normalized.includes('listo_editorial')?'LISTO_EDITORIAL':'',scores,raw};
}
function auditBlock(summary){
  const a=parseAudit(summary);
  if(!a.scores.length)return `<div class="note-card"><b>Auditoría editorial</b><p>${esc(a.raw||'Sin auditoría estructurada registrada.')}</p></div>`;
  return `<div class="audit-head"><div><span class="kicker">Auditoría editorial</span><h4>${esc(a.status||'Evaluación del guion')}</h4></div><span class="audit-note">No predice rendimiento</span></div><div class="audit-grid">${a.scores.map(s=>`<div class="audit-item"><div><span>${esc(s.label)}</span><b>${s.value}</b></div><div class="audit-track" aria-hidden="true"><span style="width:${s.value}%"></span></div></div>`).join('')}</div>`;
}

$('selectFilters').innerHTML=Object.entries(fields).map(([k,label])=>`<div><label for="${k}">${label}</label><select id="${k}"><option value="">Todos</option></select></div>`).join('');
for(const k of filterKeys){$(k).value=params.get(k)||'';$(k).addEventListener(k==='q'?'input':'change',render)}
function filters(){return Object.fromEntries(filterKeys.map(k=>[k,$(k).value]))}
function syncUrl(){const p=new URLSearchParams();if(ctx)p.set('negocio',ctx.negocioId);for(const [k,v] of Object.entries(filters()))if(v)p.set(k,v);if(current)p.set('pieza',current.id);if(view==='table')p.set('vista','tabla');history.replaceState(null,'',`${location.pathname}?${p}`)}
function options(){for(const k of Object.keys(fields)){const selected=firstOptions?(params.get(k)||''):$(k).value;const values=[...new Set(items.map(x=>x[k]))].sort((a,b)=>a.localeCompare(b,'es'));if(selected&&!values.includes(selected))values.push(selected);$(k).innerHTML='<option value="">Todos</option>'+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');$(k).value=selected}firstOptions=false}

function cardMarkup(x){
  return `<article class="card service-card" style="${serviceVars(x.service)}">
    <div class="service-stripe" aria-hidden="true"></div>
    <div class="cardtop"><span class="code">${esc(x.content_code)}</span><span class="status ${stateClass(x.estado)}">${esc(x.status)}</span></div>
    <h3>${esc(x.title)}</h3>
    <div class="card-primary-meta"><span class="service-chip">${esc(x.service)}</span>${chip(x.business,'business-chip')}</div>
    <div class="card-secondary-meta">${chip(x.type)}${chip(x.objective)}${chip(x.audience)}</div>
    <p class="card-context">${esc(x.tema||'Situación pendiente de clasificar')}</p>
    <div class="cardfoot"><span>${esc(x.hook)} · ${esc(x.version)}</span><button data-open="${esc(x.id)}">Abrir pieza →</button></div>
  </article>`;
}
function tableMarkup(x){
  return `<tr style="${serviceVars(x.service)}">
    <td data-label="Título"><button class="row-title" data-open="${esc(x.id)}">${esc(x.title)}</button><small>${esc(x.hook)} · ${esc(x.version)} · ${esc(x.type)}</small></td>
    <td data-label="Servicio"><span class="service-chip">${esc(x.service)}</span></td>
    <td data-label="Negocio objetivo" class="${valueClass(x.business)}">${esc(x.business)}</td>
    <td data-label="Objetivo"><span>${esc(x.objective)}</span><small>${esc(x.audience)}</small></td>
    <td data-label="Estado"><span class="status ${stateClass(x.estado)}">${esc(x.status)}</span></td>
  </tr>`;
}
function render(){
  if(!ready)return;
  const f=filters();filtered=filterItems(items,f);
  if(f.from&&f.to&&f.from>f.to){$('error').hidden=false;$('error').textContent='La fecha inicial debe ser anterior a la final.'}else{$('error').hidden=true}
  $('count').textContent=`${filtered.length} de ${items.length} piezas activas · historial de la marca seleccionada`;
  $('activeFilters').innerHTML=Object.entries(f).filter(([,v])=>v).map(([k,v])=>`<button data-clear="${k}">${esc(fields[k]||({q:'Búsqueda',from:'Desde',to:'Hasta'})[k])}: ${esc(v)} ×</button>`).join('');
  $('cardsView').setAttribute('aria-pressed',view==='cards');$('tableView').setAttribute('aria-pressed',view==='table');
  if(!filtered.length){$('list').innerHTML='<div class="empty"><b>No hay piezas para esta selección</b><span>Prueba quitando un filtro o importa un guion aprobado.</span></div>';syncUrl();return}
  if(view==='cards')$('list').innerHTML='<div class="grid">'+filtered.map(cardMarkup).join('')+'</div>';
  else $('list').innerHTML='<div class="tablewrap"><table><thead><tr><th>Título</th><th>Servicio</th><th>Negocio objetivo</th><th>Objetivo</th><th>Estado</th></tr></thead><tbody>'+filtered.map(tableMarkup).join('')+'</tbody></table></div>';
  syncUrl();
}

function openPiece(id){
  const x=items.find(x=>x.id===id);if(!x)return;current=x;const e=x.engine||{};
  $('detailTitle').textContent=x.title;$('pieceCode').textContent=`${x.content_code||''} · ${x.version}`;
  const sources=Array.isArray(e.sources)?e.sources:[];
  const route=Array.isArray(e.production_route)?e.production_route:[];
  const checklist=Array.isArray(e.production_checklist)?e.production_checklist:[];
  const relatives=related(items,x);
  const versions=items.filter(v=>v.id===x.id||v.parent_content_id===x.id||x.parent_content_id===v.id||(x.parent_content_id&&v.parent_content_id===x.parent_content_id)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const productionHref=`./cliente-produccion.html?negocio=${encodeURIComponent(ctx.negocioId)}`;
  const sourceHtml=sources.length?sources.map(s=>`<article class="source-card"><div class="source-top"><span class="source-type">${sourceBadge(s)}</span>${safeUrl(s.url)?`<a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">Abrir fuente ↗</a>`:''}</div><h4>${esc(s.title)}</h4><p>${esc(s.evidence_type||'Fuente registrada')}</p><small>${esc(s.limitation||'Sin limitación registrada.')}</small></article>`).join(''):'<div class="note-card"><b>Sin fuentes estructuradas</b><p>Esta pieza pertenece a un registro antiguo o incompleto.</p></div>';
  const versionHtml=versions.map(v=>v.id===x.id?`<div class="version-card current"><span>Actual</span><b>${esc(v.version)} · ${esc(v.title)}</b></div>`:`<button class="version-card" data-open="${esc(v.id)}"><span>${esc(v.version)}</span><b>${esc(v.title)}</b></button>`).join('');
  const relatedHtml=relatives.length?relatives.map(({item:v,reasons})=>`<button class="related-card" data-open="${esc(v.id)}"><span class="related-title">${esc(v.title)}</span><span class="related-reasons">${esc(reasons.join(' · '))}</span></button>`).join(''):'<div class="note-card"><b>Sin antecedentes relacionados</b><p>No hay coincidencias de clasificación dentro del registro activo consultado.</p></div>';

  $('detailBody').innerHTML=`
    <div class="detail-accent" style="${serviceVars(x.service)}">
      <div class="detail-badges"><span class="service-chip">${esc(x.service)}</span><span class="status ${stateClass(x.estado)}">${esc(x.status)}</span>${chip(x.version,'version-chip')}<span class="code-chip">${esc(x.content_code)}</span></div>
      ${factCards([['Negocio objetivo',x.business],['Servicio',x.service],['Tipo de tema',x.type],['Objetivo',x.objective],['Temperatura',x.audience],['Relación previa',x.relationship]])}
    </div>

    <section class="section card-section script-section">
      <div class="section-heading"><div><span class="kicker">Contenido principal</span><h3>Guion aprobado</h3></div><button id="copyScript" class="primary-action">Copiar guion</button></div>
      <div class="script">${esc(x.master_script)}</div>
    </section>

    <section class="section card-section rationale-section">
      <div class="section-heading"><div><span class="kicker">Contexto editorial</span><h3>Por qué se creó</h3></div></div>
      <div class="why-grid">
        <article><span>Situación</span><p>${esc(x.tema||'Sin registrar')}</p></article>
        <article><span>Enfoque</span><p>${esc(x.angulo||'Sin registrar')}</p></article>
        <article class="reward"><span>Recompensa</span><p>${esc(x.payoff||'Sin registrar')}</p></article>
      </div>
      <div class="hook-panel"><div><span>ID del hook</span><b>${esc(x.hook)}</b></div><div><span>Familia</span><b>${esc(x.family)}</b></div><div class="template-box"><span>Plantilla original del banco</span><code>${esc(x.hook_template)}</code></div></div>
      ${auditBlock(e.audit_summary)}
    </section>

    <section class="section card-section production-section">
      <div class="section-heading"><div><span class="kicker">Siguiente fase</span><h3>Ruta de producción</h3></div></div>
      ${route.length?`<div class="route-list">${route.map(s=>`<article class="route"><small>${esc(s.time||'Sin tiempo estimado')}</small><p class="route-speech">${esc(s.speech)}</p><p class="visual"><b>Se ve:</b> ${esc(s.visual)}</p><p class="visual"><b>Acción:</b> ${esc(s.action)}</p></article>`).join('')}</div>`:`<div class="empty-state"><div class="empty-icon">▶</div><div><b>Producción todavía pendiente</b><p>El guion está aprobado, pero aún no tiene una ruta de grabación registrada.</p><a class="empty-action" href="${esc(productionHref)}">Abrir producción</a></div></div>`}
      ${checklist.length?`<div class="checklist"><h4>Antes de grabar</h4><ul>${checklist.map(v=>`<li>${esc(v)}</li>`).join('')}</ul></div>`:''}
      ${e.production_pending?`<p class="pending-note"><b>Pendiente:</b> ${esc(e.production_pending)}</p>`:''}
    </section>

    <section class="section card-section sources-section">
      <div class="section-heading"><div><span class="kicker">Respaldo</span><h3>Fuentes y límites</h3></div></div>
      <div class="source-grid">${sourceHtml}</div>
    </section>

    <section class="section card-section trace-section">
      <details>
        <summary><span><span class="kicker">Historial</span><b>Aprobación y trazabilidad</b></span><span class="summary-hint">Ver detalles</span></summary>
        <div class="trace-body">${factCards([['Versión',x.version],['Aprobación original',stamp(e.approval?.approved_at)],['Registro',stamp(x.created_at)]])}<p>${esc(e.approval?.context||'Sin contexto de aprobación registrado.')}</p><p><b>Respuesta:</b> ${esc(e.approval?.text||'No registrada')}</p><div class="hash-box"><span>SHA-256 del texto aprobado</span><code>${esc(e.script_sha256||'No registrada')}</code></div></div>
      </details>
    </section>

    <section class="section card-section versions-section">
      <div class="section-heading"><div><span class="kicker">Historial de versión</span><h3>Versiones vinculadas</h3></div></div>
      <div class="version-list">${versionHtml||'<p>Sin versiones vinculadas.</p>'}</div>
    </section>

    <section class="section card-section related-section">
      <div class="section-heading"><div><span class="kicker">Antirrepetición</span><h3>Contenido relacionado <span class="count-badge">${relatives.length}</span></h3></div></div>
      <p class="section-help">Son coincidencias de clasificación; no prueban que dos piezas sean duplicadas.</p>
      <div class="related-list">${relatedHtml}</div>
    </section>`;
  $('detail').style.setProperty('--service-accent',servicePalette(x.service)[0]);
  $('detail').style.setProperty('--service-soft',servicePalette(x.service)[1]);
  $('detail').style.setProperty('--service-ink',servicePalette(x.service)[2]);
  $('copyScript').onclick=async()=>{try{await navigator.clipboard.writeText(x.master_script||'');notify('Guion copiado.')}catch{notify('No se pudo copiar. Puedes seleccionar el texto del guion.')}};
  if(!$('detail').open)$('detail').showModal();syncUrl();
}

document.addEventListener('click',ev=>{const open=ev.target.closest('[data-open]');if(open)openPiece(open.dataset.open);const clear=ev.target.closest('[data-clear]');if(clear){$(clear.dataset.clear).value='';render()}});
$('closeDetail').onclick=()=>$('detail').close();$('detail').addEventListener('close',()=>{current=null;syncUrl()});
$('clear').onclick=()=>{filterKeys.forEach(k=>$(k).value='');render()};$('cardsView').onclick=()=>{view='cards';render()};$('tableView').onclick=()=>{view='table';render()};$('logout').onclick=logoutContentVault;
function download(name,data){const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
$('export').onclick=()=>{if(!ready)return;download('historial-contenido.json',{schema_version:'1.1',negocio_id:ctx.negocioId,exported_at:new Date().toISOString(),filters:filters(),items:filtered.map(({engine,title,business,service,type,objective,audience,relationship,family,hook,status,version,...row})=>row)});notify('Historial filtrado exportado.')};

async function reload(){
  const all=[];for(let offset=0;;offset+=500){const {data,error}=await sb.from('content_piezas').select('*').eq('negocio_id',ctx.negocioId).order('created_at',{ascending:false}).order('id').range(offset,offset+499);if(error)throw error;all.push(...data);if(data.length<500)break}
  const active=all.filter(x=>x.estado!=='RETIRED');
  items=active.map(model);options();
  $('stats').innerHTML=[['Piezas activas',items.length],['Guiones aprobados',items.filter(x=>x.estado==='APPROVED').length],['Publicadas o medidas',items.filter(x=>['PUBLISHED','MEASURED','WINNER','NORMAL','LOSER'].includes(x.estado)).length],['Negocios objetivo',new Set(items.map(x=>x.business).filter(x=>x!=='Sin clasificar')).size]].map(([label,n])=>`<div class="stat"><b>${n}</b><span>${label}</span></div>`).join('');
  ready=true;render();
}

$('importButton').onclick=()=>{draft=null;$('file').value='';$('confirmApproval').checked=false;$('saveImport').disabled=true;$('importPreview').textContent='';$('importError').textContent='';$('importDialog').showModal()};
$('closeImport').onclick=()=>$('importDialog').close();
$('file').onchange=async()=>{draft=null;$('saveImport').disabled=true;$('confirmApproval').checked=false;$('importPreview').textContent='';try{const f=$('file').files[0];if(!f)return;if(f.size>2_000_000)throw Error('El expediente supera 2 MB.');const p=await validatePackage(JSON.parse(await f.text()));if(p.negocio_id&&p.negocio_id!==ctx.negocioId)throw Error('Este expediente pertenece a otra marca. Selecciona la empresa correcta.');draft=p;$('importError').textContent='';$('importPreview').innerHTML=`<h3>${esc(p.titulo)}</h3>${factCards([['Marca',ctx.negocio.nombre],['Negocio objetivo',p.metadata.content_engine_v1.target_business],['Tema',p.metadata.content_engine_v1.topic_type]])}<div class="script">${esc(p.master_script)}</div>`}catch(e){$('importError').textContent=e.message}};
$('confirmApproval').onchange=()=>{$('saveImport').disabled=!draft||!$('confirmApproval').checked};
$('saveImport').onclick=async()=>{
  if(!draft||!ctx.canEdit||!$('confirmApproval').checked)return;$('saveImport').disabled=true;
  try{
    const p=await validatePackage(draft),e=p.metadata.content_engine_v1;
    const existing=await sb.from('content_piezas').select('*').eq('negocio_id',ctx.negocioId).eq('sync_key',p.sync_key).maybeSingle();if(existing.error)throw existing.error;
    if(existing.data){if(existing.data.estado==='RETIRED')throw Error('Esta versión está archivada. Crea una revisión nueva si deseas volver a trabajar el tema.');if(existing.data.master_script!==p.master_script||existing.data.metadata?.content_engine_v1?.script_sha256!==e.script_sha256)throw Error('La identidad ya existe con otro texto. Crea una revisión; no se sobrescribió nada.');$('importDialog').close();await reload();openPiece(existing.data.id);notify('Esta versión ya estaba guardada. No se duplicó.');return}
    if(p.parent_content_id){const parent=await sb.from('content_piezas').select('id').eq('negocio_id',ctx.negocioId).eq('id',p.parent_content_id).single();if(parent.error)throw Error('La revisión no tiene una pieza anterior válida en esta marca.')}
    const payload=normalizeContentPayload(p,ctx.negocioId);payload.created_by=ctx.user.id;payload.sync_key=p.sync_key;if(p.parent_content_id)payload.parent_content_id=p.parent_content_id;
    payload.metadata={...payload.metadata,content_engine_v1:{...e,approval:{...e.approval,recorded_at:new Date().toISOString()},import_confirmed_by:ctx.user.id}};
    const result=await sb.from('content_piezas').insert(payload).select('*').single();if(result.error)throw result.error;
    const check=await sb.from('content_piezas').select('*').eq('negocio_id',ctx.negocioId).eq('id',result.data.id).single();if(check.error)throw check.error;if(check.data.master_script!==p.master_script||await sha256(check.data.master_script)!==e.script_sha256)throw Error('Guardado recibido, pero la verificación del texto falló. Revisa el registro antes de reintentar.');
    $('importDialog').close();await reload();openPiece(check.data.id);notify('Guion aprobado guardado y releído correctamente.');
  }catch(e){$('importError').textContent=(e.message||'No se pudo guardar.')+' Puedes reintentar: se comprobará la identidad antes de insertar.'}finally{$('saveImport').disabled=!draft||!$('confirmApproval').checked}
};

async function init(){try{
  ctx=await resolveContentContext({redirect:false});if(params.get('negocio')&&params.get('negocio')!==String(ctx.negocioId))throw Error('No tienes acceso a la marca solicitada. Abre tu panel y elige una empresa autorizada.');
  const {data,error}=await sb.from('negocios').select('id,nombre').in('id',ctx.memberships.map(x=>x.negocio_id));if(error)throw error;
  $('company').innerHTML=data.map(n=>`<option value="${esc(n.id)}">${esc(n.nombre)}</option>`).join('');$('company').value=ctx.negocioId;$('company').disabled=false;$('company').onchange=()=>{location.href=`./biblioteca-contenido.html?negocio=${encodeURIComponent($('company').value)}`};
  $('panelLink').href=`./cliente-panel.html?negocio=${encodeURIComponent(ctx.negocioId)}`;$('connection').textContent='Registro conectado · acceso por empresa';$('importButton').disabled=!ctx.canEdit;view=params.get('vista')==='tabla'?'table':'cards';await reload();if(params.get('pieza'))openPiece(params.get('pieza'));
}catch(e){$('error').hidden=false;$('error').textContent=e.message||'No se pudo cargar la biblioteca.';$('connection').textContent='Registro no disponible';$('list').innerHTML='<div class="empty"><b>No pudimos consultar tu historial</b><a href="./cliente-acceso.html">Iniciar sesión</a> · <button onclick="location.reload()">Reintentar</button></div>';$('count').textContent='Historial sin consultar';$('export').disabled=true}}
init();