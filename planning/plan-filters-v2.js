import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/+esm';

const URL='https://xnlzsgulskqyecfgzhwa.supabase.co';
const KEY='sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32';
const BUSINESS='48182e1a-06d5-4685-9627-7891d7aafacb';
const PLAN_KEY='olano-editorial-v10';
const sb=createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-PE').trim();
const stateKeys=['planned','draft','approved','recorded','published'];
const stateLabels={planned:'Por desarrollar',draft:'Guion vinculado · revisar',approved:'Guion aprobado',recorded:'Grabado',published:'Publicado'};
let episodes=[],services=[],statusMap=new Map(),scheduled=false;

function controls(){return {status:document.getElementById('contentStatus'),search:document.getElementById('contentSearch'),service:document.getElementById('service'),audience:document.getElementById('audience'),objective:document.getElementById('objective'),motivation:document.getElementById('motivation')}}
function statusOf(key){return statusMap.get(key)?.state_key||'planned'}
function searchable(ep){const svc=services.find(s=>s.id===ep.service)?.name||ep.service;return norm([ep.key,ep.title,ep.question,ep.signal,ep.payoff,svc,ep.objective,ep.audience,ep.motivation,ep.category,ep.format].join(' '))}
function matches(ep){
 const c=controls();
 if(c.service?.value&&ep.service!==c.service.value)return false;
 if(c.audience?.value&&ep.audience!==c.audience.value)return false;
 if(c.objective?.value&&ep.objective!==c.objective.value)return false;
 if(c.motivation?.value&&ep.motivation!==c.motivation.value)return false;
 if(c.status?.value&&statusOf(ep.key)!==c.status.value)return false;
 const q=norm(c.search?.value);if(q&&!searchable(ep).includes(q))return false;
 return true;
}
function annotateState(el,key){const st=statusMap.get(key);if(!st)return;for(const k of stateKeys)el.classList.remove(k);el.classList.add(st.state_key);const label=el.querySelector('.state');if(label)label.textContent=st.state_label||stateLabels[st.state_key]||st.state_key;}
function renderStats(filtered){const host=document.getElementById('stats');if(!host)return;const cards=[...host.querySelectorAll('.stat')];if(cards.length<4)return;const counts={published:0,approved:0,planned:0};for(const ep of filtered){const s=statusOf(ep.key);if(s==='published')counts.published++;else if(['approved','recorded'].includes(s))counts.approved++;else counts.planned++;}
 const vals=[[filtered.length,'temas filtrados'],[counts.published,'publicados'],[counts.approved,'guiones aprobados / grabados'],[counts.planned,'por desarrollar / revisar']];
 vals.forEach(([n,l],i)=>{const b=cards[i]?.querySelector('b'),small=cards[i]?.querySelector('small');if(b)b.textContent=n;if(small)small.textContent=l});}
function apply(){scheduled=false;if(!episodes.length)return;const filtered=episodes.filter(matches),visible=new Set(filtered.map(e=>e.key));
 document.querySelectorAll('.slot[data-episode]').forEach(el=>{const key=el.dataset.episode;annotateState(el,key);el.hidden=!visible.has(key)});
 document.querySelectorAll('.episode-row[data-episode]').forEach(el=>{const key=el.dataset.episode;annotateState(el,key);el.hidden=!visible.has(key)});
 document.querySelectorAll('#series details').forEach(d=>{const rows=[...d.querySelectorAll('.episode-row[data-episode]')];d.hidden=rows.length>0&&!rows.some(r=>!r.hidden)});
 renderStats(filtered);
 const result=document.getElementById('filterResultCount');if(result)result.textContent=`${filtered.length} resultado${filtered.length===1?'':'s'}`;
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply)}
async function init(){const c=controls();if(!c.status||!c.search)return;
 const [{data:plan,error:pe},{data:states,error:se}]=await Promise.all([
  sb.from('content_planes_editoriales').select('document').eq('negocio_id',BUSINESS).eq('plan_key',PLAN_KEY).maybeSingle(),
  sb.from('content_public_plan_status_v').select('episode_key,state_key,state_label').eq('negocio_id',BUSINESS).eq('plan_key',PLAN_KEY)
 ]);
 if(pe)console.warn('No se pudo cargar el índice de búsqueda',pe);if(se)console.warn('No se pudo cargar el estado público',se);
 episodes=plan?.document?.episodes||[];services=plan?.document?.services||[];statusMap=new Map((states||[]).map(x=>[x.episode_key,x]));
 ['change','input'].forEach(type=>document.querySelector('.filters')?.addEventListener(type,schedule));
 document.getElementById('reset')?.addEventListener('click',()=>{c.status.value='';c.search.value='';setTimeout(schedule,0)});
 const observer=new MutationObserver(schedule);for(const id of ['calendarGrid','series','stats']){const node=document.getElementById(id);if(node)observer.observe(node,{childList:true,subtree:true})}
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
