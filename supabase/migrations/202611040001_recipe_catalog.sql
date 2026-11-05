create table public.recipe_sources (
  id text primary key,
  name text not null,
  website_url text not null,
  permission_basis text not null check (length(trim(permission_basis)) > 0)
);

create table public.recipe_creators (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  profile_url text
);

create table public.camera_generations (id text primary key, name text not null);
create table public.camera_models (
  id text primary key,
  name text not null,
  generation_id text not null references public.camera_generations
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.recipe_sources,
  source_record_id text not null,
  creator_id uuid not null references public.recipe_creators,
  name text not null,
  source_url text not null check (source_url ~ '^https?://'),
  unique (source_id, source_record_id)
);

-- Store the source settings per compatible model, with shape enforced by its camera profile.
create table public.recipe_camera_settings (
  recipe_id uuid not null references public.recipes on delete cascade,
  camera_id text not null references public.camera_models,
  settings jsonb not null check (jsonb_typeof(settings) = 'object'),
  primary key (recipe_id, camera_id)
);

create table public.recipe_profiles (
  recipe_id uuid primary key references public.recipes on delete cascade,
  saturation real not null check (saturation between 0 and 1),
  contrast real not null check (contrast between 0 and 1),
  warmth real not null check (warmth between -1 and 1),
  highlights real not null check (highlights between 0 and 1),
  shadows real not null check (shadows between 0 and 1 and shadows <= highlights)
);
create table public.aesthetic_tags (id text primary key);
create table public.recipe_tags (
  recipe_id uuid not null references public.recipes on delete cascade,
  tag_id text not null references public.aesthetic_tags,
  primary key (recipe_id, tag_id)
);

create table public.recipe_example_images (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes on delete cascade,
  image_url text not null,
  credit text not null,
  permission_basis text not null check (length(trim(permission_basis)) > 0)
);

insert into public.camera_generations values ('x-trans-iii', 'X-Trans III');
insert into public.camera_models values ('x-t2', 'Fujifilm X-T2', 'x-trans-iii');
insert into public.aesthetic_tags values
  ('warm'), ('cool'), ('neutral'), ('muted'), ('vivid'), ('soft'), ('crisp'), ('monochrome');

alter table public.recipe_sources enable row level security;
alter table public.recipe_creators enable row level security;
alter table public.camera_generations enable row level security;
alter table public.camera_models enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_camera_settings enable row level security;
alter table public.recipe_profiles enable row level security;
alter table public.aesthetic_tags enable row level security;
alter table public.recipe_tags enable row level security;
alter table public.recipe_example_images enable row level security;

create view public.recipe_catalog with (security_invoker = true) as
select r.id, r.name, c.display_name as creator, r.source_url, s.camera_id, s.settings,
  jsonb_build_object(
    'saturation', p.saturation, 'contrast', p.contrast, 'warmth', p.warmth,
    'highlights', p.highlights, 'shadows', p.shadows,
    'tags', array(select t.tag_id from public.recipe_tags t where t.recipe_id = r.id order by t.tag_id)
  ) as profile
from public.recipes r
join public.recipe_creators c on c.id = r.creator_id
join public.recipe_camera_settings s on s.recipe_id = r.id
join public.recipe_profiles p on p.recipe_id = r.id;

create index recipe_camera_settings_camera_id_idx on public.recipe_camera_settings (camera_id);
revoke all on public.recipe_catalog from public, anon, authenticated;
grant select on public.recipe_catalog, public.recipes, public.recipe_creators,
  public.recipe_camera_settings, public.recipe_profiles, public.recipe_tags to service_role;
