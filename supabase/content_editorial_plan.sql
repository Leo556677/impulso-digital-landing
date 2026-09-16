-- Additive planning storage. Does not alter the canonical pieces/projects contracts.
create table public.content_planes_editoriales (
 id uuid primary key default gen_random_uuid(),
 negocio_id uuid not null references public.negocios(id),
 plan_key text not null,
 document jsonb not null check ((jsonb_typeof(document)='object' and jsonb_typeof(document->'episodes')='array' and document->>'schema'='impulso.editorial-plan.v1') is true),
 revision bigint not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(negocio_id,plan_key)
);
alter table public.content_planes_editoriales enable row level security;
revoke all on public.content_planes_editoriales from anon,authenticated;
grant select on public.content_planes_editoriales to authenticated;
grant update(document) on public.content_planes_editoriales to authenticated;
create policy editorial_plan_read on public.content_planes_editoriales for select to authenticated using (private.es_miembro_negocio(negocio_id));
create policy editorial_plan_update on public.content_planes_editoriales for update to authenticated using (private.puede_administrar_negocio(negocio_id)) with check (private.puede_administrar_negocio(negocio_id));
create function public.validate_editorial_plan() returns trigger language plpgsql security invoker set search_path='' as $$
declare ep jsonb; seen text[] := '{}'; linked text[] := '{}'; piece uuid; old_ep jsonb;
begin
 if TG_OP='UPDATE' then
  if NEW.negocio_id<>OLD.negocio_id or NEW.plan_key<>OLD.plan_key then raise exception 'Plan identity cannot change'; end if;
  if (NEW.document-'episodes') is distinct from (OLD.document-'episodes') or jsonb_array_length(NEW.document->'episodes')<>jsonb_array_length(OLD.document->'episodes') then raise exception 'Closed collections require a new plan edition'; end if;
  NEW.revision:=OLD.revision+1;
 end if;
 for ep in select value from jsonb_array_elements(NEW.document->'episodes') loop
  if coalesce(ep->>'key','')='' or (ep->>'key')=any(seen) then raise exception 'Episode key missing or duplicated'; end if;
  seen:=array_append(seen,ep->>'key');
  if TG_OP='UPDATE' then
   select value into old_ep from jsonb_array_elements(OLD.document->'episodes') where value->>'key'=ep->>'key';
   if old_ep is null or (ep-'reference_date'-'content_id') is distinct from (old_ep-'reference_date'-'content_id') then raise exception 'Only dates and piece links can change in a closed edition'; end if;
  end if;
  if ep->>'reference_date' is not null then perform (ep->>'reference_date')::date; end if;
  if ep->>'content_id' is not null then
   if (ep->>'content_id')=any(linked) then raise exception 'A piece cannot fill two episodes'; end if;
   linked:=array_append(linked,ep->>'content_id');
   piece:=(ep->>'content_id')::uuid;
   if not exists(select 1 from public.content_piezas p where p.id=piece and p.negocio_id=NEW.negocio_id) then raise exception 'Linked piece must belong to this business'; end if;
  end if;
 end loop;
 NEW.updated_at:=now();
 return NEW;
end $$;
revoke all on function public.validate_editorial_plan() from public,anon,authenticated;
create trigger editorial_plan_validate before insert or update on public.content_planes_editoriales for each row execute function public.validate_editorial_plan();
comment on table public.content_planes_editoriales is 'Reference editorial plans, separate from canonical briefs, scripts, approvals and publication dates. No plan field grants approval.';
