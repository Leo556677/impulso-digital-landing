-- Run as a database administrator. All test writes are rolled back.
BEGIN;
DO $test$
DECLARE n uuid; p public.content_proyectos; again public.content_proyectos; cp jsonb; failed boolean; uid uuid; cid uuid; before_script text; viewdoc jsonb; before_count bigint;
BEGIN
 SELECT id INTO STRICT n FROM public.negocios WHERE slug='dr-olano';
 SELECT count(*) INTO before_count FROM public.content_proyectos WHERE negocio_id=n;
 cp:=jsonb_build_object('revision_id','test-start','role','00','parent_revision_id',null,'source_revision_ids','[]'::jsonb,'change_summary','Prueba transaccional','payload','{}'::jsonb,'next_role',null,'readiness','EN_TRABAJO','delivery_key','test-start');
 p:=public.content_project_init(n,'TEST_ROLLBACK','Prueba','{}'::jsonb,cp);
 again:=public.content_project_init(n,'TEST_ROLLBACK','Prueba','{}'::jsonb,cp); ASSERT again.id=p.id AND again.created_at=p.created_at;
 failed:=false; BEGIN PERFORM public.content_project_init(n,'TEST_ROLLBACK','Prueba','{"different":true}',cp); EXCEPTION WHEN raise_exception THEN failed:=true; END; ASSERT failed;
 cp:=cp||jsonb_build_object('revision_id','test-draft','delivery_key','test-draft','role','02');
 again:=public.content_project_work(n,p.id,p.version,cp); ASSERT again.version=p.version+1;
 p:=public.content_project_work(n,p.id,1,cp); ASSERT p.version=again.version;
 failed:=false; BEGIN PERFORM public.content_project_work(n,p.id,1,cp||jsonb_build_object('revision_id','stale','delivery_key','stale','parent_revision_id','test-draft')); EXCEPTION WHEN serialization_failure THEN failed:=true; END; ASSERT failed;
 failed:=false; BEGIN UPDATE public.content_proyectos SET project_number=99999,version=version+1 WHERE id=p.id; EXCEPTION WHEN raise_exception THEN failed:=true; END; ASSERT failed;
 -- Invalid identity cannot be attached to an existing piece.
 SELECT id,master_script,metadata->'recording_view_v1' INTO cid,before_script,viewdoc FROM public.content_piezas WHERE negocio_id=n AND metadata ? 'recording_view_v1' LIMIT 1;
 failed:=false; BEGIN UPDATE public.content_piezas SET metadata=metadata||jsonb_build_object('project_ref_v1',jsonb_build_object('schema_version','1.0','project_id',p.id,'project_number',99999,'project_created_at',p.created_at)) WHERE id=cid AND negocio_id=n; EXCEPTION WHEN raise_exception THEN failed:=true; END; ASSERT failed;
 IF viewdoc IS NOT NULL THEN
  failed:=false; BEGIN PERFORM public.content_recording_save(n,cid,viewdoc->>'approved_script_version',viewdoc||jsonb_build_object('teleprompter_text','Texto incompleto')); EXCEPTION WHEN raise_exception THEN failed:=true; END; ASSERT failed;
  ASSERT (SELECT master_script=before_script FROM public.content_piezas WHERE id=cid AND negocio_id=n);
 END IF;
 -- Authenticated non-member has neither read access nor write authority.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 ASSERT (SELECT count(*) FROM public.content_proyectos WHERE negocio_id=n)=0;
 failed:=false; BEGIN PERFORM public.content_project_init(n,'UNAUTHORIZED_TEST','Prueba','{}'::jsonb,cp||jsonb_build_object('role','00')); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END; ASSERT failed;
 RESET ROLE;
 -- Existing business administrator can read and append through the RPC, but not overwrite the table.
 SELECT user_id INTO STRICT uid FROM public.usuarios_negocio WHERE negocio_id=n AND rol IN ('admin','propietario') LIMIT 1;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 ASSERT (SELECT count(*) FROM public.content_proyectos WHERE negocio_id=n)=before_count+1;
 cp:=cp||jsonb_build_object('revision_id','admin-append','delivery_key','admin-append','parent_revision_id','test-draft');
 again:=public.content_project_work(n,p.id,p.version,cp); ASSERT again.version=p.version+1;
 failed:=false; BEGIN UPDATE public.content_proyectos SET metadata='{}' WHERE id=p.id; EXCEPTION WHEN insufficient_privilege THEN failed:=true; END; ASSERT failed;
 RESET ROLE;
 SET LOCAL ROLE anon;
 failed:=false; BEGIN PERFORM 1 FROM public.content_proyectos; EXCEPTION WHEN insufficient_privilege THEN failed:=true; END; ASSERT failed;
 RESET ROLE;
END $test$;
ROLLBACK;
