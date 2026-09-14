ALTER TABLE public.content_publicaciones ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(metadata)='object');
CREATE FUNCTION public.content_publication_version(p_negocio_id uuid,p_publication_id uuid,p_script_version text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u public.content_publicaciones; c public.content_piezas; ref jsonb;
BEGIN
 PERFORM private.content_project_authorize(p_negocio_id);
 SELECT * INTO u FROM public.content_publicaciones WHERE id=p_publication_id AND negocio_id=p_negocio_id FOR UPDATE;
 IF NOT FOUND OR u.estado<>'PUBLISHED' OR u.published_at IS NULL OR nullif(btrim(u.url),'') IS NULL THEN RAISE EXCEPTION 'Falta una publicación real con fecha y enlace'; END IF;
 SELECT * INTO c FROM public.content_piezas WHERE id=u.content_id AND negocio_id=p_negocio_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pieza no encontrada en este negocio'; END IF;
 ref:=c.metadata->'project_ref_v1';
 IF ref IS NULL OR nullif(p_script_version,'') IS NULL THEN RAISE EXCEPTION 'Falta proyecto o versión realmente publicada'; END IF;
 IF p_script_version IS DISTINCT FROM c.metadata#>>'{script_revision_v1,approved_script_version}' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(c.metadata->'script_history_v1','[]'::jsonb)) WHERE value#>>'{script_revision_v1,approved_script_version}'=p_script_version) THEN RAISE EXCEPTION 'La versión no pertenece a esta pieza'; END IF;
 IF u.metadata->>'published_script_version' IS NOT NULL AND u.metadata->>'published_script_version'<>p_script_version THEN RAISE EXCEPTION 'La publicación ya está vinculada a otra versión; reconciliar antes de cambiar'; END IF;
 UPDATE public.content_publicaciones SET metadata=metadata||jsonb_build_object('project_ref_v1',ref,'published_script_version',p_script_version) WHERE id=u.id AND negocio_id=p_negocio_id RETURNING metadata INTO ref;
 RETURN ref;
END $$;
REVOKE ALL ON FUNCTION public.content_publication_version(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.content_publication_version(uuid,uuid,text) TO authenticated,service_role;
NOTIFY pgrst,'reload schema';
