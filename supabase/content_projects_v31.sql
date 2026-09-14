-- Additive project persistence. Existing content states and business permissions stay intact.
CREATE TABLE public.content_proyectos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), negocio_id uuid NOT NULL REFERENCES public.negocios(id),
 project_number bigint NOT NULL CHECK(project_number>0), request_key text NOT NULL CHECK(length(btrim(request_key)) BETWEEN 1 AND 200),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 version bigint NOT NULL DEFAULT 1 CHECK(version>0), archived_at timestamptz,
 metadata jsonb NOT NULL CHECK(jsonb_typeof(metadata->'work_v1')='object'),
 UNIQUE(negocio_id,project_number), UNIQUE(negocio_id,request_key), UNIQUE(negocio_id,id)
);
CREATE TABLE private.content_project_counters(negocio_id uuid PRIMARY KEY REFERENCES public.negocios(id), last_number bigint NOT NULL CHECK(last_number>0));
ALTER TABLE public.content_proyectos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_proyectos FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.content_proyectos TO authenticated,service_role;
REVOKE ALL ON private.content_project_counters FROM PUBLIC,anon,authenticated,service_role;
CREATE POLICY content_proyectos_leer ON public.content_proyectos FOR SELECT TO authenticated USING(private.es_miembro_negocio(negocio_id));

CREATE FUNCTION private.content_project_authorize(p_negocio uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT ((session_user IN ('postgres','supabase_admin') AND coalesce(nullif(current_setting('role',true),'none'),session_user) IN ('postgres','supabase_admin'))
 OR current_setting('role',true)='service_role' OR private.puede_administrar_negocio(p_negocio)) THEN
  RAISE EXCEPTION 'No tienes permiso para modificar este negocio' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.negocios WHERE id=p_negocio AND activo) THEN RAISE EXCEPTION 'Negocio no disponible'; END IF;
END $$;
REVOKE ALL ON FUNCTION private.content_project_authorize(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.content_checkpoint_validate(c jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF jsonb_typeof(c) IS DISTINCT FROM 'object' OR nullif(btrim(c->>'revision_id'),'') IS NULL
 OR nullif(btrim(c->>'delivery_key'),'') IS NULL OR nullif(btrim(c->>'change_summary'),'') IS NULL
 OR coalesce(c->>'role','') NOT IN ('00','01','02','03','04','05')
 OR coalesce(c->>'readiness','') NOT IN ('EN_TRABAJO','DISPONIBLE','BLOQUEADO')
 OR (c->>'next_role' IS NOT NULL AND c->>'next_role' NOT IN ('00','01','02','03','04','05'))
 OR jsonb_typeof(c->'source_revision_ids') IS DISTINCT FROM 'array' OR jsonb_typeof(c->'payload') IS DISTINCT FROM 'object'
 THEN RAISE EXCEPTION 'Avance incompleto o inválido'; END IF;
 IF c->>'role'='00' AND c->>'readiness'='DISPONIBLE' AND jsonb_typeof(c#>'{payload,STRATEGY_INPUT}') IS DISTINCT FROM 'object'
 THEN RAISE EXCEPTION 'Falta STRATEGY_INPUT para continuar en Estrategia'; END IF;
END $$;
REVOKE ALL ON FUNCTION private.content_checkpoint_validate(jsonb) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.content_project_init(p_negocio_id uuid,p_request_key text,p_title text,p_initial_input jsonb,p_checkpoint jsonb)
RETURNS public.content_proyectos LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.content_proyectos; num bigint; cp jsonb; t timestamptz:=clock_timestamp();
BEGIN
 PERFORM private.content_project_authorize(p_negocio_id);
 PERFORM private.content_checkpoint_validate(p_checkpoint);
 IF p_checkpoint->>'role'<>'00' OR p_checkpoint->>'parent_revision_id' IS NOT NULL OR jsonb_array_length(p_checkpoint->'source_revision_ids')<>0
 OR nullif(btrim(p_title),'') IS NULL OR jsonb_typeof(p_initial_input) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Arranque inválido'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('content_project:'||p_negocio_id::text,0));
 SELECT * INTO r FROM public.content_proyectos WHERE negocio_id=p_negocio_id AND request_key=p_request_key;
 IF FOUND THEN
  IF r.metadata#>'{work_v1,initial_input}' IS DISTINCT FROM p_initial_input
   OR r.metadata#>'{work_v1,checkpoints,0,request_snapshot}' IS DISTINCT FROM (p_checkpoint-'saved_at'-'generated_at')
  THEN RAISE EXCEPTION 'La clave de creación ya corresponde a otro contenido'; END IF;
  RETURN r;
 END IF;
 INSERT INTO private.content_project_counters VALUES(p_negocio_id,1)
 ON CONFLICT(negocio_id) DO UPDATE SET last_number=private.content_project_counters.last_number+1 RETURNING last_number INTO num;
 cp:=(p_checkpoint-'saved_at'-'generated_at')||jsonb_build_object('saved_at',t,'request_snapshot',p_checkpoint-'saved_at'-'generated_at');
 INSERT INTO public.content_proyectos(negocio_id,project_number,request_key,created_at,updated_at,metadata)
 VALUES(p_negocio_id,num,p_request_key,t,t,jsonb_build_object('work_v1',jsonb_build_object('schema_version','1.0','title',p_title,'initial_input',p_initial_input,'checkpoints',jsonb_build_array(cp),'current_revision_by_role',jsonb_build_object('00',cp->>'revision_id'),'links',jsonb_build_object('current_brief_id',null,'content_id',null)))) RETURNING * INTO r;
 RETURN r;
END $$;

CREATE FUNCTION public.content_project_work(p_negocio_id uuid,p_project_id uuid,p_expected_version bigint,p_checkpoint jsonb)
RETURNS public.content_proyectos LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.content_proyectos; oldcp jsonb; cp jsonb; source_id text; w jsonb; t timestamptz:=clock_timestamp();
BEGIN
 PERFORM private.content_project_authorize(p_negocio_id); PERFORM private.content_checkpoint_validate(p_checkpoint);
 SELECT * INTO r FROM public.content_proyectos WHERE id=p_project_id AND negocio_id=p_negocio_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Proyecto no encontrado en este negocio'; END IF;
 w:=r.metadata->'work_v1';
 SELECT value INTO oldcp FROM jsonb_array_elements(w->'checkpoints') WHERE value->>'revision_id'=p_checkpoint->>'revision_id';
 IF FOUND THEN
  IF oldcp->'request_snapshot' IS DISTINCT FROM (p_checkpoint-'saved_at'-'generated_at') THEN RAISE EXCEPTION 'La revisión ya existe con otro contenido'; END IF;
  RETURN r;
 END IF;
 IF r.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Proyecto archivado'; END IF;
 IF p_expected_version IS DISTINCT FROM r.version THEN RAISE EXCEPTION 'El proyecto cambió; vuelve a leerlo antes de guardar' USING ERRCODE='40001'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(w->'checkpoints') WHERE value->>'delivery_key'=p_checkpoint->>'delivery_key') THEN RAISE EXCEPTION 'Entrega ya utilizada'; END IF;
 IF p_checkpoint->>'parent_revision_id' IS DISTINCT FROM w#>>ARRAY['current_revision_by_role',p_checkpoint->>'role'] THEN RAISE EXCEPTION 'La revisión anterior de este chat no coincide'; END IF;
 FOR source_id IN SELECT jsonb_array_elements_text(p_checkpoint->'source_revision_ids') LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(w->'checkpoints') WHERE value->>'revision_id'=source_id) THEN RAISE EXCEPTION 'Revisión de origen no encontrada en este proyecto'; END IF;
 END LOOP;
 cp:=(p_checkpoint-'saved_at'-'generated_at')||jsonb_build_object('saved_at',t,'request_snapshot',p_checkpoint-'saved_at'-'generated_at');
 IF cp->>'role'='02' THEN cp:=cp||jsonb_build_object('generated_at',t); END IF;
 w:=jsonb_set(w,'{checkpoints}',(w->'checkpoints')||jsonb_build_array(cp));
 w:=jsonb_set(w,ARRAY['current_revision_by_role',cp->>'role'],cp->'revision_id');
 UPDATE public.content_proyectos SET metadata=jsonb_set(metadata,'{work_v1}',w),version=version+1,updated_at=t WHERE id=r.id RETURNING * INTO r;
 RETURN r;
END $$;

CREATE FUNCTION public.content_project_link(p_negocio_id uuid,p_project_id uuid,p_expected_version bigint,p_brief_id uuid DEFAULT NULL,p_content_id uuid DEFAULT NULL)
RETURNS public.content_proyectos LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.content_proyectos; b public.content_briefs; c public.content_piezas; ref jsonb; links jsonb;
BEGIN
 PERFORM private.content_project_authorize(p_negocio_id);
 SELECT * INTO r FROM public.content_proyectos WHERE id=p_project_id AND negocio_id=p_negocio_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Proyecto no encontrado en este negocio'; END IF;
 IF p_brief_id IS NULL AND p_content_id IS NULL THEN RAISE EXCEPTION 'Falta el trabajo que se quiere enlazar'; END IF;
 links:=r.metadata#>'{work_v1,links}';
 ref:=jsonb_build_object('schema_version','1.0','project_id',r.id,'project_number',r.project_number,'project_created_at',r.created_at);
 IF p_brief_id IS NOT NULL THEN
  SELECT * INTO b FROM public.content_briefs WHERE id=p_brief_id AND negocio_id=p_negocio_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Brief no encontrado en este negocio'; END IF;
  IF b.metadata#>>'{project_ref_v1,project_id}' IS NOT NULL AND b.metadata#>>'{project_ref_v1,project_id}'<>r.id::text THEN RAISE EXCEPTION 'Brief asociado a otro proyecto'; END IF;
  links:=links||jsonb_build_object('current_brief_id',b.id);
 END IF;
 IF p_content_id IS NOT NULL THEN
  SELECT * INTO c FROM public.content_piezas WHERE id=p_content_id AND negocio_id=p_negocio_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pieza no encontrada en este negocio'; END IF;
  IF c.metadata#>>'{project_ref_v1,project_id}' IS NOT NULL AND c.metadata#>>'{project_ref_v1,project_id}'<>r.id::text THEN RAISE EXCEPTION 'Pieza asociada a otro proyecto'; END IF;
  IF r.metadata#>>'{work_v1,links,content_id}' IS NOT NULL AND r.metadata#>>'{work_v1,links,content_id}'<>c.id::text THEN RAISE EXCEPTION 'El proyecto ya tiene otra pieza'; END IF;
  links:=links||jsonb_build_object('content_id',c.id);
 END IF;
 IF links->>'current_brief_id' IS NOT NULL AND links->>'content_id' IS NOT NULL THEN
  SELECT * INTO b FROM public.content_briefs WHERE id=(links->>'current_brief_id')::uuid AND negocio_id=p_negocio_id;
  SELECT * INTO c FROM public.content_piezas WHERE id=(links->>'content_id')::uuid AND negocio_id=p_negocio_id;
  IF b.consumed_by_content_id IS DISTINCT FROM c.id AND c.metadata->>'brief_id' IS DISTINCT FROM b.brief_id THEN RAISE EXCEPTION 'No hay relación de origen entre brief y pieza'; END IF;
 END IF;
 IF links=r.metadata#>'{work_v1,links}' AND (p_brief_id IS NULL OR b.metadata->'project_ref_v1'=ref) AND (p_content_id IS NULL OR c.metadata->'project_ref_v1'=ref) THEN RETURN r; END IF;
 IF r.version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'El proyecto cambió; vuelve a leerlo antes de enlazar' USING ERRCODE='40001'; END IF;
 IF p_brief_id IS NOT NULL THEN UPDATE public.content_briefs SET metadata=metadata||jsonb_build_object('project_ref_v1',ref) WHERE id=p_brief_id AND negocio_id=p_negocio_id; END IF;
 IF p_content_id IS NOT NULL THEN UPDATE public.content_piezas SET metadata=metadata||jsonb_build_object('project_ref_v1',ref) WHERE id=p_content_id AND negocio_id=p_negocio_id; END IF;
 UPDATE public.content_proyectos SET metadata=jsonb_set(metadata,'{work_v1,links}',links),version=version+1,updated_at=clock_timestamp() WHERE id=r.id RETURNING * INTO r;
 RETURN r;
END $$;

CREATE FUNCTION private.content_project_identity_guard() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.negocio_id IS DISTINCT FROM OLD.negocio_id OR NEW.project_number IS DISTINCT FROM OLD.project_number
 OR NEW.request_key IS DISTINCT FROM OLD.request_key OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'La identidad del proyecto es permanente'; END IF;
 IF NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'La versión debe avanzar una vez'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER content_project_identity BEFORE UPDATE ON public.content_proyectos FOR EACH ROW EXECUTE FUNCTION private.content_project_identity_guard();

CREATE FUNCTION private.content_project_ref_guard() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r public.content_proyectos; ref jsonb;
BEGIN
 ref:=NEW.metadata->'project_ref_v1';
 IF TG_OP='UPDATE' AND OLD.metadata ? 'project_ref_v1' AND (ref IS NULL OR ref->>'project_id' IS DISTINCT FROM OLD.metadata#>>'{project_ref_v1,project_id}') THEN RAISE EXCEPTION 'No se puede desvincular o cambiar el proyecto'; END IF;
 IF ref IS NOT NULL THEN
  SELECT * INTO r FROM public.content_proyectos WHERE id=(ref->>'project_id')::uuid AND negocio_id=NEW.negocio_id;
  IF NOT FOUND OR ref->>'schema_version' IS DISTINCT FROM '1.0' OR (ref->>'project_number')::bigint IS DISTINCT FROM r.project_number OR (ref->>'project_created_at')::timestamptz IS DISTINCT FROM r.created_at THEN RAISE EXCEPTION 'La referencia del proyecto no corresponde al negocio o a su identidad'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER content_brief_project_ref BEFORE INSERT OR UPDATE ON public.content_briefs FOR EACH ROW EXECUTE FUNCTION private.content_project_ref_guard();
CREATE TRIGGER content_piece_project_ref BEFORE INSERT OR UPDATE ON public.content_piezas FOR EACH ROW EXECUTE FUNCTION private.content_project_ref_guard();

REVOKE ALL ON FUNCTION public.content_project_init(uuid,text,text,jsonb,jsonb),public.content_project_work(uuid,uuid,bigint,jsonb),public.content_project_link(uuid,uuid,bigint,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.content_project_init(uuid,text,text,jsonb,jsonb),public.content_project_work(uuid,uuid,bigint,jsonb),public.content_project_link(uuid,uuid,bigint,uuid,uuid) TO authenticated,service_role;
REVOKE ALL ON FUNCTION private.content_project_identity_guard(),private.content_project_ref_guard() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
