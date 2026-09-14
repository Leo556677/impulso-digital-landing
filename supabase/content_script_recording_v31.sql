CREATE FUNCTION private.content_normalize_text(t text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT btrim(regexp_replace(coalesce(t,''),'[[:space:]]+',' ','g')) $$;

CREATE FUNCTION public.content_recording_save(p_negocio_id uuid,p_content_id uuid,p_expected_script_version text,p_view jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.content_piezas; r public.content_proyectos; texts text; ids jsonb; scene_ids jsonb; closing jsonb; v jsonb; refs_ok boolean;
BEGIN
 PERFORM private.content_project_authorize(p_negocio_id);
 SELECT * INTO c FROM public.content_piezas WHERE id=p_content_id AND negocio_id=p_negocio_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pieza no encontrada'; END IF;
 IF c.metadata#>>'{script_revision_v1,approved_script_version}' IS DISTINCT FROM p_expected_script_version OR nullif(p_expected_script_version,'') IS NULL THEN RAISE EXCEPTION 'La versión aprobada cambió'; END IF;
 SELECT * INTO r FROM public.content_proyectos WHERE id=(c.metadata#>>'{project_ref_v1,project_id}')::uuid AND negocio_id=p_negocio_id;
 IF NOT FOUND OR p_view->>'project_id' IS DISTINCT FROM r.id::text OR p_view->>'approved_script_version' IS DISTINCT FROM p_expected_script_version
 OR p_view->>'schema_version' IS DISTINCT FROM '1.0' OR p_view->>'language' IS DISTINCT FROM 'es-PE'
 OR jsonb_typeof(p_view->'spoken_segments') IS DISTINCT FROM 'array' OR jsonb_typeof(p_view->'scenes') IS DISTINCT FROM 'array'
 OR jsonb_typeof(p_view->'recording_order') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Guía incompleta o de otro proyecto'; END IF;
 IF p_view->>'source_project_version' IS NULL OR (p_view->>'source_project_version')::bigint>r.version THEN RAISE EXCEPTION 'Versión de origen inválida'; END IF;
 SELECT string_agg(value->>'text',' ' ORDER BY (value->>'order')::int),jsonb_agg(value->'segment_id' ORDER BY (value->>'order')::int) INTO texts,ids FROM jsonb_array_elements(p_view->'spoken_segments');
 IF private.content_normalize_text(texts) IS DISTINCT FROM private.content_normalize_text(c.master_script)
 OR private.content_normalize_text(p_view->>'teleprompter_text') IS DISTINCT FROM private.content_normalize_text(c.master_script) THEN RAISE EXCEPTION 'El texto hablado no coincide íntegramente con el guion aprobado'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_view->'spoken_segments') GROUP BY value->>'segment_id' HAVING count(*)>1)
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_view->'spoken_segments') WHERE nullif(value->>'segment_id','') IS NULL OR nullif(value->>'text','') IS NULL OR (value->>'order')::int<1)
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_view->'spoken_segments') GROUP BY value->>'order' HAVING count(*)>1) THEN RAISE EXCEPTION 'Segmentos repetidos o inválidos'; END IF;
 SELECT jsonb_agg(seg.value ORDER BY (sc.value->>'narrative_order')::int,seg.ord) INTO scene_ids
 FROM jsonb_array_elements(p_view->'scenes') sc CROSS JOIN LATERAL jsonb_array_elements(sc.value->'spoken_segment_ids') WITH ORDINALITY seg(value,ord) WHERE sc.value->>'scene_kind'='PRINCIPAL';
 IF scene_ids IS DISTINCT FROM ids THEN RAISE EXCEPTION 'Las escenas omiten, duplican o reordenan texto'; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(p_view->'spoken_segments') WHERE value->>'function'='CLOSING')<>1 THEN RAISE EXCEPTION 'Debe existir un único cierre hablado'; END IF;
 SELECT value INTO closing FROM jsonb_array_elements(p_view->'spoken_segments') ORDER BY (value->>'order')::int DESC LIMIT 1;
 IF closing->>'function' IS DISTINCT FROM 'CLOSING' OR closing->>'segment_id' IS DISTINCT FROM p_view->>'closing_segment_id'
 OR private.content_normalize_text(closing->>'text') IS DISTINCT FROM private.content_normalize_text(c.cta_master)
 OR nullif(btrim(c.cta_master),'') IS NULL
 OR (length(private.content_normalize_text(texts))-length(replace(private.content_normalize_text(texts),private.content_normalize_text(c.cta_master),'')))/length(private.content_normalize_text(c.cta_master))<>1
 THEN RAISE EXCEPTION 'El cierre debe coincidir y aparecer una sola vez al final'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_view->'scenes') WHERE value->>'scene_kind' NOT IN ('PRINCIPAL','APOYO','ALTERNATIVA') OR nullif(value->>'scene_id','') IS NULL)
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_view->'scenes') GROUP BY value->>'scene_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Escenas inválidas'; END IF;
 IF (SELECT jsonb_agg(value->'scene_id' ORDER BY value->>'scene_id') FROM jsonb_array_elements(p_view->'scenes')) IS DISTINCT FROM
 (SELECT jsonb_agg(value ORDER BY value#>>'{}') FROM jsonb_array_elements(p_view->'recording_order')) THEN RAISE EXCEPTION 'Orden de grabación incompleto'; END IF;
 SELECT NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_view->'scenes') sc WHERE (sc.value->>'reference_required')::boolean IS TRUE AND (nullif(sc.value->>'reference_url','') IS NULL OR NOT EXISTS(SELECT 1 FROM public.content_tomas t WHERE t.negocio_id=p_negocio_id AND t.pieza_id=c.id AND t.reference_url=sc.value->>'reference_url'))) INTO refs_ok;
 IF NOT refs_ok THEN RAISE EXCEPTION 'Faltan referencias obligatorias asociadas a esta pieza'; END IF;
 IF p_view#>>'{checks,plain_language}' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Falta la revisión del lenguaje'; END IF;
 v:=p_view||jsonb_build_object('generated_at',clock_timestamp(),'checks',coalesce(p_view->'checks','{}'::jsonb)||jsonb_build_object('integrity',true,'closing_unique',true,'scene_equality',true,'version_current',true));
 UPDATE public.content_piezas SET metadata=metadata||jsonb_build_object('recording_view_v1',v),production_status=production_status||jsonb_build_object('PRODUCTION_READY',p_view#>>'{checks,visual_alignment}'='true' AND p_view#>>'{checks,references_accessible}'='true') WHERE id=c.id AND negocio_id=p_negocio_id;
 RETURN v;
END $$;

CREATE FUNCTION public.content_script_revision(p_negocio_id uuid,p_project_id uuid,p_expected_project_version bigint,p_expected_script_version text,p_checkpoint_id text,p_approval_text text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.content_proyectos; c public.content_piezas; cp jsonb; d jsonb; a jsonb; v text; event_key text; history jsonb; t timestamptz:=clock_timestamp();
BEGIN
 PERFORM private.content_project_authorize(p_negocio_id);
 SELECT * INTO r FROM public.content_proyectos WHERE id=p_project_id AND negocio_id=p_negocio_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Proyecto no encontrado'; END IF;
 SELECT * INTO c FROM public.content_piezas WHERE id=(r.metadata#>>'{work_v1,links,content_id}')::uuid AND negocio_id=p_negocio_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'El proyecto no tiene pieza aprobada'; END IF;
 event_key:='REVISION:'||r.id||':'||p_checkpoint_id;
 IF c.metadata#>>'{script_revision_v1,event_key}'=event_key THEN RETURN jsonb_build_object('content_id',c.id,'project_version',r.version,'script_revision_v1',c.metadata->'script_revision_v1'); END IF;
 IF r.version IS DISTINCT FROM p_expected_project_version OR c.metadata#>>'{script_revision_v1,approved_script_version}' IS DISTINCT FROM p_expected_script_version THEN RAISE EXCEPTION 'El proyecto o guion cambió; releer antes de aprobar' USING ERRCODE='40001'; END IF;
 IF nullif(btrim(p_approval_text),'') IS NULL THEN RAISE EXCEPTION 'Falta la aprobación explícita del usuario'; END IF;
 SELECT value INTO cp FROM jsonb_array_elements(r.metadata#>'{work_v1,checkpoints}') WHERE value->>'revision_id'=p_checkpoint_id AND value->>'role'='02';
 IF cp IS NULL OR cp->>'revision_id' IS DISTINCT FROM r.metadata#>>'{work_v1,current_revision_by_role,02}' THEN RAISE EXCEPTION 'La revisión de guion no es la vigente'; END IF;
 d:=cp->'payload'; a:=d->'editorial_audit_v1'; v:=d->>'script_version';
 IF nullif(v,'') IS NULL OR v=p_expected_script_version OR a->>'reviewed_script_version' IS DISTINCT FROM v OR a->>'status' IS DISTINCT FROM 'LISTO_EDITORIAL'
 OR nullif(btrim(d->>'master_script'),'') IS NULL OR nullif(btrim(d->>'cta_master'),'') IS NULL
 OR jsonb_typeof(a->'parts') IS DISTINCT FROM 'array' OR jsonb_typeof(a->'gates') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Falta texto, versión o auditoría vigente'; END IF;
 IF jsonb_array_length(a->'parts')<>8 OR (SELECT count(DISTINCT value->>'key') FROM jsonb_array_elements(a->'parts'))<>8 OR (SELECT count(DISTINCT value->>'key') FROM jsonb_array_elements(a->'gates'))<8 OR jsonb_array_length(a->'gates')<8 OR EXISTS(SELECT 1 FROM jsonb_array_elements(a->'parts') WHERE coalesce((value->>'score')::int,0)<80)
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(a->'gates') WHERE value->>'pass' IS DISTINCT FROM 'true') THEN RAISE EXCEPTION 'La auditoría no permite aprobar'; END IF;
 IF right(private.content_normalize_text(d->>'master_script'),length(private.content_normalize_text(d->>'cta_master'))) IS DISTINCT FROM private.content_normalize_text(d->>'cta_master') THEN RAISE EXCEPTION 'El cierre hablado debe estar al final'; END IF;
 history:=coalesce(c.metadata->'script_history_v1','[]'::jsonb)||jsonb_build_array(jsonb_build_object('script_revision_v1',c.metadata->'script_revision_v1','master_script',c.master_script,'cta_master',c.cta_master,'editorial_audit_v1',c.metadata->'editorial_audit_v1','recording_view_v1',c.metadata->'recording_view_v1','production_status',c.production_status,'saved_at',t));
 UPDATE public.content_piezas SET master_script=d->>'master_script',cta_master=d->>'cta_master',approved_at=t,
 metadata=(metadata-'recording_view_v1')||jsonb_build_object('script_history_v1',history,'editorial_audit_v1',a,'script_revision_v1',jsonb_build_object('schema_version','1.0','approved_script_version',v,'approved_checkpoint_id',p_checkpoint_id,'generated_at',cp->'generated_at','revision_number',coalesce((c.metadata#>>'{script_revision_v1,revision_number}')::int,jsonb_array_length(coalesce(c.metadata->'script_history_v1','[]'::jsonb))+1)+1,'approved_at',t,'previous_approved_script_version',p_expected_script_version,'event_key',event_key,'approval_text',p_approval_text)),
 production_status=production_status||jsonb_build_object('SCRIPT_APPROVED',true,'PRODUCTION_READY',false,'EDIT_READY',false,'PUBLISH_READY',false)
 WHERE id=c.id AND negocio_id=p_negocio_id;
 UPDATE public.content_proyectos SET version=version+1,updated_at=t WHERE id=r.id RETURNING * INTO r;
 RETURN jsonb_build_object('content_id',c.id,'project_version',r.version,'approved_script_version',v,'event_key',event_key);
END $$;
REVOKE ALL ON FUNCTION private.content_normalize_text(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.content_recording_save(uuid,uuid,text,jsonb),public.content_script_revision(uuid,uuid,bigint,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.content_recording_save(uuid,uuid,text,jsonb),public.content_script_revision(uuid,uuid,bigint,text,text,text) TO authenticated,service_role;
NOTIFY pgrst,'reload schema';
