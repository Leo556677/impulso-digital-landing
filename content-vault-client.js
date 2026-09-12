import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/+esm';

const SUPABASE_URL = 'https://xnlzsgulskqyecfgzhwa.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32';

export const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

const LABEL_ALIASES = {
  CONTENT_ID:'content_code', TITULO:'titulo', TÍTULO:'titulo', SERVICIO:'servicio', TEMA:'tema', SUBTEMA:'subtema',
  OBJETIVO:'objetivo', TEMPERATURA:'temperatura', CATEGORIA:'categoria', CATEGORÍA:'categoria', ANGULO:'angulo', ÁNGULO:'angulo',
  TESIS:'tesis', OBJETIVO_MENTAL:'objetivo_mental', PUBLICO:'publico', PÚBLICO:'publico', ETAPA_FUNNEL:'etapa_funnel',
  PRESENTADOR:'presentador', PROFESIONAL_RESPONSABLE:'profesional_responsable', ROL_DEL_PRESENTADOR:'rol_presentador',
  FORMATO:'formato', DURACION:'duracion_seg', DURACIÓN:'duracion_seg', DURACION_MASTER:'duracion_seg', DURACIÓN_MASTER:'duracion_seg',
  HOOK_FAMILY:'hook_family', HOOK_ID:'hook_id', HOOK_TEMPLATE:'hook_template', HOOK:'hook_verbal', HOOK_VERBAL:'hook_verbal',
  HOOK_VISUAL:'hook_visual', HOOK_TEXTO:'hook_texto', HOOK_SONORO:'hook_sonoro', OPEN_LOOP:'open_loop', REHOOKS:'rehooks', RE_HOOKS:'rehooks',
  PAYOFF:'payoff', CTA_INTENCION:'cta_intencion', CTA_INTENCIÓN:'cta_intencion', CTA_FAMILY:'cta_family', CTA:'cta_master', CTA_MASTER:'cta_master',
  DESTINO:'cta_destino', MASTER_SCRIPT:'master_script', GUION:'master_script', PLATAFORMAS:'plataformas', CAMPANA:'campana', CAMPAÑA:'campana',
  CLUSTER:'cluster_key', CLUSTER_KEY:'cluster_key', TAGS:'tags', STATUS:'estado', ESTADO:'estado', PARENT_CONTENT_ID:'parent_content_code',
  VARIANT_TYPE:'variant_type', TEST_ID:'test_id', FECHA_PUBLICACION:'fecha_publicacion', FECHA_PUBLICACIÓN:'fecha_publicacion'
};

const KNOWN_LABELS = new Set(Object.keys(LABEL_ALIASES));
const PLATFORM_MAP = new Map([['TT','TIKTOK'],['TIKTOK','TIKTOK'],['IG','INSTAGRAM'],['INSTAGRAM','INSTAGRAM'],['FB','FACEBOOK'],['FACEBOOK','FACEBOOK']]);
const SIMPLE_SECTIONS = new Set(['HOOK','DESARROLLO','PAYOFF','CTA']);
const clean = (value) => String(value ?? '').trim();
const upperLabel = (value) => clean(value).toUpperCase().normalize('NFC');
const norm = (value) => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

function splitList(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return clean(value).split(/\s*(?:,|\+|\/|\||;|→)\s*/g).map(clean).filter(Boolean);
}

function parsePlatforms(value) {
  const values = splitList(value).map((item) => PLATFORM_MAP.get(item.toUpperCase()) || item.toUpperCase());
  const allowed = [...new Set(values.filter((item) => ['TIKTOK','INSTAGRAM','FACEBOOK'].includes(item)))];
  return allowed.length ? allowed : ['TIKTOK','INSTAGRAM','FACEBOOK'];
}

function parseDuration(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(1, Math.round(value));
  const match = clean(value).match(/\d+/);
  return match ? Math.max(1, Number(match[0])) : null;
}

function normalizeRehooks(value) {
  if (Array.isArray(value)) {
    return value.map((item,index) => typeof item === 'string' ? {orden:index+1,frase:clean(item)} : item).filter(Boolean);
  }
  const text = clean(value);
  if (!text) return [];
  return text.split(/\n|\s*→\s*|\s*\|\s*/g).map(clean).filter(Boolean).map((frase,index)=>({orden:index+1,frase}));
}

function stripOuterQuotes(value) {
  let text = clean(value);
  const pairs = [['“','”'],['"','"'],["'","'"],['‘','’']];
  for (const [a,b] of pairs) {
    if (text.startsWith(a) && text.endsWith(b) && text.length >= 2) {
      text = text.slice(a.length, text.length-b.length).trim();
      break;
    }
  }
  return text;
}

function simpleHeading(line) {
  return upperLabel(line)
    .replace(/^#+\s*/,'')
    .replace(/^\*\*|\*\*$/g,'')
    .replace(/:$/,'')
    .trim();
}

function parseSimpleSections(source) {
  const sections = {};
  let current = null;
  let buffer = [];
  const flush = () => {
    if (!current) return;
    const value = stripOuterQuotes(buffer.join('\n').trim());
    if (value) sections[current] = value;
    current = null;
    buffer = [];
  };

  for (const raw of source.split(/\r?\n/)) {
    const heading = simpleHeading(raw.trim());
    if (SIMPLE_SECTIONS.has(heading)) {
      flush();
      current = heading;
      continue;
    }
    if (current) buffer.push(raw);
  }
  flush();

  if (!sections.HOOK || !sections.DESARROLLO) return null;
  return sections;
}

function detectService(text) {
  const n = norm(text);
  const aliases = [
    ['TOXINA BOTULÍNICA',['toxina botulinica','botox','bótox']],
    ['PRP FACIAL',['prp facial','prp','plasma rico en plaquetas']],
    ['HYDRAFACIAL / LIMPIEZA CON APARATOLOGÍA',['hydrafacial','limpieza con aparatologia','limpieza facial con aparatologia']],
    ['LIPOSUCCIÓN DE PAPADA',['liposuccion de papada','lipo de papada','lipo papada']],
    ['BICHECTOMÍA',['bichectomia','bolas de bichat']]
  ];
  for (const [service, words] of aliases) {
    if (words.some((word) => n.includes(norm(word)))) return service;
  }
  return '';
}

function inferObjective(cta, text) {
  const c = norm(cta);
  const n = norm(text);
  if (/agend|reserv|cita/.test(c)) return 'RESERVA';
  if (/evalu|que corresponde|qué corresponde|tu caso/.test(c)) return 'EVALUACIÓN';
  if (/coment|dejala abajo|déjala abajo|escribe|comparte|compart|guarda/.test(c)) return 'ALCANCE';
  if (/confia|confianza|seguridad|criterio medico|criterio médico/.test(n)) return 'CONFIANZA';
  return 'EDUCACIÓN';
}

function inferCategory(hook, desarrollo, payoff, cta) {
  const all = norm([hook,desarrollo,payoff,cta].join(' '));
  const h = norm(hook);
  if (/mito|falso|verdad|no es cierto|error comun|error común/.test(all)) return 'C3. MITO / REENCUADRE';
  if (/vs\b|versus|compar|diferencia entre|mejor que/.test(all)) return 'C8. COMPARACIÓN / DECISIÓN';
  if (/paso a paso|proceso|como se hace|cómo se hace|durante el procedimiento/.test(all)) return 'C6. PROCESO / DEMOSTRACIÓN';
  if (/caso|antes y despues|antes y después|resultado real|evolucion|evolución/.test(all)) return 'C5. PRUEBA / RESULTADO / CASO';
  if (/agend|reserv|cita/.test(norm(cta))) return 'C9. CONVERSIÓN / ACCIÓN';
  if (/[?¿]/.test(hook) || /para cualquiera|para todos|es para ti|puedo|deberia|debería|miedo|duda|no necesariamente/.test(all)) return 'C7. OBJECIONES / MIEDOS / FAQ';
  if (/criterio|evaluar|evaluacion|evaluación|indicado|indicación/.test(all)) return 'C4. AUTORIDAD / CRITERIO';
  return 'C2. EDUCACIÓN / CLARIDAD';
}

function inferTheme(hook, service, payoff) {
  const all = norm(`${hook} ${payoff}`);
  if (/para cualquiera|para todos|es para ti|indicado|indicacion/.test(all)) return 'INDICACIÓN / PARA QUIÉN';
  if (/natural|congel|expresion|expresión/.test(all)) return 'NATURALIDAD';
  if (/miedo|duda|objecion|objeción/.test(all)) return 'OBJECIONES';
  if (/precio|costo|cuesta/.test(all)) return 'PRECIO';
  if (/dura|duracion|duración|tiempo/.test(all)) return 'DURACIÓN';
  if (/resultado|cambio|mejora/.test(all)) return 'RESULTADOS';
  const words = stripOuterQuotes(hook).replace(/[¿?¡!.,;:]/g,' ').split(/\s+/).filter(Boolean).slice(0,7);
  return words.length ? words.join(' ').toUpperCase() : service;
}

function inferCtaIntent(cta) {
  const c = norm(cta);
  if (!c) return null;
  if (/agend|reserv|cita/.test(c)) return 'RESERVA';
  if (/evalu|tu caso|que corresponde/.test(c)) return 'EVALUACIÓN';
  if (/coment|dejala abajo|déjala abajo|escribe|responde/.test(c)) return 'INTERACCIÓN';
  if (/guarda/.test(c)) return 'GUARDADO';
  if (/comparte|compart/.test(c)) return 'COMPARTIR';
  if (/perfil|bio/.test(c)) return 'PERFIL';
  if (/sigue|seguime|sígueme/.test(c)) return 'SEGUIR';
  return 'INTERACCIÓN';
}

function simpleTags(service, theme, category) {
  const serviceTag = service
    .replace('HYDRAFACIAL / LIMPIEZA CON APARATOLOGÍA','HYDRAFACIAL')
    .replace('LIPOSUCCIÓN DE PAPADA','PAPADA');
  const cat = clean(category).split('.')[0];
  return [...new Set([serviceTag, theme, cat].map(clean).filter(Boolean))];
}

function buildSimplePackage(source, sections) {
  const servicio = detectService(source);
  if (!servicio) {
    throw new Error('No pude reconocer el servicio en el texto. Menciona el servicio dentro del hook o desarrollo para clasificarlo automáticamente.');
  }

  const hook = sections.HOOK;
  const desarrollo = sections.DESARROLLO;
  const payoff = sections.PAYOFF || '';
  const cta = sections.CTA || '';
  const objetivo = inferObjective(cta, source);
  const categoria = inferCategory(hook, desarrollo, payoff, cta);
  const tema = inferTheme(hook, servicio, payoff);
  const words = source.split(/\s+/).filter(Boolean).length;
  const duration = Math.max(10, Math.round(words / 2.25));
  const angleBase = payoff || hook;

  return {
    titulo: stripOuterQuotes(hook).replace(/[¿?]/g,'').slice(0,180),
    servicio,
    tema,
    subtema: null,
    objetivo,
    temperatura: 'FRÍA',
    categoria,
    angulo: angleBase,
    tesis: payoff || angleBase,
    objetivo_mental: payoff ? `Comprender que ${payoff.charAt(0).toLowerCase()}${payoff.slice(1)}` : null,
    publico: `PERSONAS INTERESADAS EN ${servicio}`,
    etapa_funnel: ['RESERVA','EVALUACIÓN'].includes(objetivo) ? 'DECISIÓN' : 'DESCUBRIMIENTO / CONSIDERACIÓN',
    formato: /[?¿]/.test(hook) ? 'FAQ' : 'TALKING_HEAD',
    duracion_seg: duration,
    hook_verbal: hook,
    open_loop: hook,
    payoff: payoff || null,
    cta_intencion: inferCtaIntent(cta),
    cta_master: cta || null,
    master_script: source,
    plataformas: ['TIKTOK','INSTAGRAM','FACEBOOK'],
    tags: simpleTags(servicio, tema, categoria),
    estado: 'APPROVED',
    metadata: {
      analysis_source: 'SIMPLE_STRUCTURE_RULES',
      structure: 'HOOK_DESARROLLO_PAYOFF_CTA',
      analyzed_at: new Date().toISOString()
    }
  };
}

export function parseRegisterPackage(text) {
  const source = clean(text).replace(/^```(?:text|json)?\s*/i,'').replace(/```$/i,'').trim();
  if (!source) throw new Error('El contenido está vacío.');

  const simple = parseSimpleSections(source);
  if (simple) return buildSimplePackage(source, simple);

  const lines = source.split(/\r?\n/);
  const parsed = {};
  let activeKey = null;
  let buffer = [];
  const flush = () => {
    if (!activeKey) return;
    const value = buffer.join('\n').trim();
    if (value) parsed[activeKey] = parsed[activeKey] ? `${parsed[activeKey]}\n${value}` : value;
    activeKey = null; buffer = [];
  };
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) { if (activeKey && buffer.length) buffer.push(''); continue; }
    if (/^(REGISTER_PACKAGE|SCRIPT_PACKAGE|CONTENT_PACKAGE)$/i.test(line.trim())) continue;
    const match = line.match(/^([^:]{2,64}):\s*(.*)$/);
    if (match) {
      const label = upperLabel(match[1]);
      if (KNOWN_LABELS.has(label)) { flush(); activeKey = LABEL_ALIASES[label]; buffer = match[2] ? [match[2]] : []; continue; }
    }
    if (activeKey) buffer.push(line);
  }
  flush();
  if (!Object.keys(parsed).length) throw new Error('PLAIN_TEXT');
  return parsed;
}

function read(input,...keys) {
  for (const key of keys) {
    if (input?.[key] !== undefined && input?.[key] !== null && clean(input[key]) !== '') return input[key];
    const upper = key.toUpperCase();
    if (input?.[upper] !== undefined && input?.[upper] !== null && clean(input[upper]) !== '') return input[upper];
  }
  return null;
}

export function normalizeContentPayload(input, negocioId) {
  if (!input || typeof input !== 'object') throw new Error('El contenido recibido no es válido.');
  if (!negocioId) throw new Error('No se pudo resolver la empresa activa.');
  const servicio = clean(read(input,'servicio'));
  const objetivo = clean(read(input,'objetivo'));
  const angulo = clean(read(input,'angulo'));
  const masterScript = clean(read(input,'master_script','guion','script'));
  if (!servicio) throw new Error('Falta SERVICIO.');
  if (!objetivo) throw new Error('Falta OBJETIVO.');
  if (!angulo) throw new Error('Falta ÁNGULO.');
  if (!masterScript) throw new Error('Falta MASTER_SCRIPT.');
  const plataformas = parsePlatforms(read(input,'plataformas'));
  const tags = splitList(read(input,'tags'));
  const rawStatus = clean(read(input,'estado','status')).toUpperCase();
  const allowedStatuses = new Set(['APPROVED','RECORDED','EDITED','PUBLISHED','MEASURED','WINNER','NORMAL','LOSER','RETIRED','NEEDS_REVIEW']);
  const incomingMetadata = input?.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata) ? input.metadata : {};
  return {
    negocio_id: negocioId,
    titulo: clean(read(input,'titulo')) || null,
    servicio,
    tema: clean(read(input,'tema')) || null,
    subtema: clean(read(input,'subtema')) || null,
    objetivo,
    temperatura: clean(read(input,'temperatura')) || null,
    categoria: clean(read(input,'categoria')) || null,
    angulo,
    tesis: clean(read(input,'tesis')) || null,
    objetivo_mental: clean(read(input,'objetivo_mental')) || null,
    publico: clean(read(input,'publico')) || null,
    etapa_funnel: clean(read(input,'etapa_funnel')) || null,
    presentador: clean(read(input,'presentador')) || null,
    profesional_responsable: clean(read(input,'profesional_responsable')) || null,
    rol_presentador: clean(read(input,'rol_presentador')) || null,
    formato: clean(read(input,'formato')) || null,
    duracion_seg: parseDuration(read(input,'duracion_seg','duracion')),
    hook_family: clean(read(input,'hook_family')) || null,
    hook_id: clean(read(input,'hook_id')) || null,
    hook_template: clean(read(input,'hook_template')) || null,
    hook_verbal: clean(read(input,'hook_verbal','hook')) || null,
    hook_visual: clean(read(input,'hook_visual')) || null,
    hook_texto: clean(read(input,'hook_texto')) || null,
    hook_sonoro: clean(read(input,'hook_sonoro')) || null,
    open_loop: clean(read(input,'open_loop')) || null,
    rehooks: normalizeRehooks(read(input,'rehooks')),
    payoff: clean(read(input,'payoff')) || null,
    cta_intencion: clean(read(input,'cta_intencion')) || null,
    cta_family: clean(read(input,'cta_family')) || null,
    cta_master: clean(read(input,'cta_master','cta')) || null,
    cta_destino: clean(read(input,'cta_destino')) || null,
    master_script: masterScript,
    plataformas,
    estado: allowedStatuses.has(rawStatus) ? rawStatus : 'APPROVED',
    fecha_publicacion: clean(read(input,'fecha_publicacion')) || null,
    campana: clean(read(input,'campana')) || null,
    cluster_key: clean(read(input,'cluster_key','cluster')) || null,
    tags,
    variant_type: clean(read(input,'variant_type')) || null,
    test_id: clean(read(input,'test_id')) || null,
    metadata: {...incomingMetadata, source: clean(read(input,'source')) || incomingMetadata.source || 'CONTENT_ENGINE', imported_at: new Date().toISOString()}
  };
}

export async function resolveContentContext({redirect=true}={}) {
  const {data:{session},error:sessionError}=await sb.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.user) { if (redirect) location.replace('./cliente-acceso.html'); throw new Error('Necesitas iniciar sesión.'); }
  const {data:memberships,error:membershipError}=await sb.from('usuarios_negocio').select('negocio_id,rol,created_at').order('created_at');
  if (membershipError) throw membershipError;
  if (!memberships?.length) throw new Error('Tu usuario no tiene una empresa autorizada.');
  const params=new URLSearchParams(location.search),requested=params.get('negocio'),saved=localStorage.getItem('impulso_negocio_activo');
  const pick=(id)=>memberships.find((item)=>String(item.negocio_id)===String(id));
  const membership=pick(requested)||pick(saved)||memberships[0],negocioId=membership.negocio_id;
  localStorage.setItem('impulso_negocio_activo',String(negocioId));
  const {data:negocio,error:negocioError}=await sb.from('negocios').select('id,nombre,slug').eq('id',negocioId).single();
  if (negocioError) throw negocioError;
  return {session,user:session.user,memberships,membership,negocio,negocioId,canEdit:['admin','propietario'].includes(membership.rol)};
}

export async function analyzeContentText(text, context=null) {
  const raw=clean(text);
  if (!raw) throw new Error('Pega primero el contenido que quieres guardar.');
  const ctx=context||await resolveContentContext({redirect:false});

  try {
    const pkg=parseRegisterPackage(raw);
    if (pkg.servicio && pkg.objetivo && pkg.angulo && pkg.master_script) return pkg;
  } catch (error) {
    if (error?.message !== 'PLAIN_TEXT') throw error;
  }

  const {data,error}=await sb.functions.invoke('content-vault-analyze',{body:{negocio_id:ctx.negocioId,texto:raw}});
  if (error) {
    let detail='';
    try { if (error.context?.json) { const j=await error.context.json(); detail=j?.error||''; } } catch {}
    throw new Error(detail || error.message || 'No se pudo analizar el contenido.');
  }
  if (!data?.ok || !data?.data) throw new Error(data?.error || 'El analizador no devolvió una ficha válida.');
  return data.data;
}

export async function saveContent(input, context=null) {
  const ctx=context||await resolveContentContext({redirect:false});
  if (!ctx.canEdit) throw new Error('Tu rol puede consultar la biblioteca, pero no guardar piezas.');
  const parsed=typeof input==='string' ? await analyzeContentText(input,ctx) : input;
  const payload=normalizeContentPayload(parsed,ctx.negocioId);
  if (parsed.parent_content_id) payload.parent_content_id=parsed.parent_content_id;
  const {data,error}=await sb.from('content_piezas').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function listContent(negocioId) {
  const {data,error}=await sb.from('content_piezas').select('*').eq('negocio_id',negocioId).order('created_at',{ascending:false});
  if (error) throw error;
  return data||[];
}

export async function updateContent(id,negocioId,patch) {
  const safePatch={...patch};
  delete safePatch.id; delete safePatch.negocio_id; delete safePatch.content_num; delete safePatch.content_code; delete safePatch.created_by; delete safePatch.created_at;
  const {data,error}=await sb.from('content_piezas').update(safePatch).eq('id',id).eq('negocio_id',negocioId).select('*').single();
  if (error) throw error;
  return data;
}

export async function retireContent(id,negocioId) { return updateContent(id,negocioId,{estado:'RETIRED'}); }
export async function logoutContentVault() { await sb.auth.signOut(); location.replace('./cliente-acceso.html'); }

// Integración estable para cualquier generador web de Impulso Digital:
// 1) texto HOOK / DESARROLLO / PAYOFF / CTA -> parseo automático sin copiar campo por campo.
// 2) REGISTER_PACKAGE completo -> se respeta tal cual.
// 3) texto libre -> se deriva al analizador IA.
