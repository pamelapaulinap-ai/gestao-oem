-- Gestão O&M: estrutura do banco no Supabase.
-- Cole todo este texto no SQL Editor do Supabase e clique em "Run". Pode rodar de novo sem problema.

-- 1) Documentos do painel (notificações, regularização, rotas, financeiro, combustível, configurações)
create table if not exists public.docs (
  path        text primary key,
  coll        text not null,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid()
);
create index if not exists docs_coll_idx on public.docs (coll);

-- 2) Arquivos convertidos (rota de cabos do KMZ, KMZ de regularização)
create table if not exists public.blobs (
  id          text primary key,
  content     text not null,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid()
);

-- 3) Só quem está logado lê e grava; visitantes sem login não veem nada
alter table public.docs  enable row level security;
alter table public.blobs enable row level security;

drop policy if exists "logados leem docs"     on public.docs;
drop policy if exists "logados gravam docs"   on public.docs;
drop policy if exists "logados leem blobs"    on public.blobs;
drop policy if exists "logados gravam blobs"  on public.blobs;
create policy "logados leem docs"    on public.docs  for select to authenticated using (true);
create policy "logados gravam docs"  on public.docs  for all    to authenticated using (true) with check (true);
create policy "logados leem blobs"   on public.blobs for select to authenticated using (true);
create policy "logados gravam blobs" on public.blobs for all    to authenticated using (true) with check (true);

-- 4) Atualização parcial de um documento (junta campos; valor null apaga o campo)
create or replace function public.jsonb_merge_deep(a jsonb, b jsonb)
returns jsonb language plpgsql immutable as $$
declare k text; v jsonb; r jsonb := coalesce(a, '{}'::jsonb);
begin
  for k, v in select * from jsonb_each(coalesce(b, '{}'::jsonb)) loop
    if v = 'null'::jsonb then
      r := r - k;
    elsif jsonb_typeof(v) = 'object' and jsonb_typeof(r -> k) = 'object' then
      r := jsonb_set(r, array[k], public.jsonb_merge_deep(r -> k, v));
    else
      r := jsonb_set(r, array[k], v, true);
    end if;
  end loop;
  return r;
end $$;

create or replace function public.doc_update(p_path text, p_patch jsonb)
returns void language plpgsql security invoker as $$
begin
  update public.docs
     set data = public.jsonb_merge_deep(data, p_patch), updated_at = now(), updated_by = auth.uid()
   where path = p_path;
  if not found then raise exception 'not_found: %', p_path; end if;
end $$;

grant execute on function public.doc_update(text, jsonb) to authenticated;

-- 5) Atualização ao vivo: quando alguém altera, os outros veem na hora
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;
