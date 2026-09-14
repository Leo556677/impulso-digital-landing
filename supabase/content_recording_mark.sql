CREATE FUNCTION public.content_recording_mark(p_negocio_id uuid,p_session_piece_id uuid,p_estado text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.content_sesion_piezas; c public.content_piezas; t timestamptz; done boolean;
BEGIN
 PERFORM private.content_project_authorize(p_negocio_id);
 IF p_estado NOT IN ('GRABADO','PENDIENTE') OR p_estado IS NULL THEN RAISE EXCEPTION 'Estado no válido'; END IF;
 SELECT * INTO l FROM public.content_sesion_piezas WHERE id=p_session_piece_id AND negocio_id=p_negocio_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Video no encontrado'; END IF;
 PERFORM 1 FROM public.content_sesiones WHERE id=l.sesion_id AND negocio_id=p_negocio_id AND estado<>'ARCHIVADA' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sesión no disponible'; END IF;
 SELECT * INTO c FROM public.content_piezas WHERE id=l.pieza_id AND negocio_id=p_negocio_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pieza no encontrada'; END IF;
 IF p_estado='GRABADO' AND c.metadata ? 'project_ref_v1' AND c.production_status->>'RECORDED' IS DISTINCT FROM 'true'
 AND (c.production_status->>'PRODUCTION_READY' IS DISTINCT FROM 'true' OR c.metadata#>>'{recording_view_v1,approved_script_version}' IS DISTINCT FROM c.metadata#>>'{script_revision_v1,approved_script_version}' OR NOT(c.metadata ? 'recording_view_v1')) THEN RAISE EXCEPTION 'La guía de esta versión todavía no está lista'; END IF;
 t:=CASE WHEN p_estado='GRABADO' THEN coalesce(l.grabado_at,clock_timestamp()) ELSE null END;
 UPDATE public.content_sesion_piezas SET estado=p_estado,grabado_at=t WHERE id=l.id AND negocio_id=p_negocio_id;
 IF p_estado='GRABADO' THEN
  UPDATE public.content_piezas SET production_status=production_status||jsonb_build_object('RECORDED',true),estado=CASE WHEN estado='APPROVED' THEN 'RECORDED' ELSE estado END WHERE id=c.id AND negocio_id=p_negocio_id;
 END IF;
 SELECT bool_and(estado='GRABADO') INTO done FROM public.content_sesion_piezas WHERE sesion_id=l.sesion_id AND negocio_id=p_negocio_id;
 UPDATE public.content_sesiones SET estado=CASE WHEN done THEN 'COMPLETADA' ELSE 'EN_GRABACION' END WHERE id=l.sesion_id AND negocio_id=p_negocio_id;
 RETURN jsonb_build_object('estado',p_estado,'grabado_at',t);
END $$;
REVOKE ALL ON FUNCTION public.content_recording_mark(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.content_recording_mark(uuid,uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
