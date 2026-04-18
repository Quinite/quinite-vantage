create table public.units (
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  project_id uuid null,
  base_price numeric(12, 2) not null,
  bedrooms integer null,
  bathrooms integer null,
  status text not null default 'available'::text,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  unit_number text null,
  metadata jsonb null default '{}'::jsonb,
  archived_at timestamp with time zone null,
  archived_by uuid null,
  tower_id uuid null,
  facing text null,
  floor_rise_price numeric(12, 2) null default 0,
  plc_price numeric(12, 2) null default 0,
  carpet_area numeric(8, 2) null,
  built_up_area numeric(8, 2) null,
  super_built_up_area numeric(8, 2) null,
  floor_number integer null default 1,
  lead_id uuid null,
  config_id uuid null,
  transaction_type text null,
  total_price numeric(15, 2) null default 0,
  plot_area numeric(12, 2) null default 0,
  balconies integer null default 0,
  is_corner boolean null default false,
  is_vastu_compliant boolean null default false,
  possession_date date null,
  completion_date date null,
  construction_status text null,
  updated_by uuid null,
  is_archived boolean null default false,
  constraint properties_pkey primary key (id),
  constraint units_project_unit_number_key unique (project_id, unit_number),
  constraint properties_created_by_fkey foreign KEY (created_by) references profiles (id) on delete set null,
  constraint properties_lead_id_fkey foreign KEY (lead_id) references leads (id) on delete set null,
  constraint properties_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint properties_project_id_fkey foreign KEY (project_id) references projects (id) on delete CASCADE,
  constraint units_config_id_fkey foreign KEY (config_id) references unit_configs (id) on delete set null,
  constraint units_updated_by_fkey foreign KEY (updated_by) references profiles (id),
  constraint properties_archived_by_fkey foreign KEY (archived_by) references profiles (id),
  constraint fk_properties_tower foreign KEY (tower_id) references towers (id) on delete set null,
  constraint units_construction_status_check check (
    (
      construction_status = any (
        array[
          'under_construction'::text,
          'ready_to_move'::text,
          'completed'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_properties_project_status on public.units using btree (project_id, status) TABLESPACE pg_default;

create index IF not exists idx_properties_archived_at on public.units using btree (archived_at) TABLESPACE pg_default
where
  (archived_at is null);

create index IF not exists idx_units_config_id on public.units using btree (config_id) TABLESPACE pg_default;

create index IF not exists idx_units_project_id on public.units using btree (project_id) TABLESPACE pg_default;

create index IF not exists idx_units_tower_id on public.units using btree (tower_id) TABLESPACE pg_default;

create index IF not exists idx_properties_tower_id on public.units using btree (tower_id) TABLESPACE pg_default;

create index IF not exists idx_properties_floor on public.units using btree (tower_id, floor_number) TABLESPACE pg_default;

create index IF not exists idx_units_status on public.units using btree (status) TABLESPACE pg_default;

create index IF not exists idx_properties_lead_id on public.units using btree (lead_id) TABLESPACE pg_default;

create index IF not exists idx_properties_project on public.units using btree (project_id) TABLESPACE pg_default;

create index IF not exists idx_properties_status on public.units using btree (status) TABLESPACE pg_default;

create trigger property_delete_sync
after DELETE on units for EACH row
execute FUNCTION sync_project_units_on_delete ();

create trigger property_status_sync
after INSERT
or
update OF status,
project_id on units for EACH row
execute FUNCTION sync_project_units ();