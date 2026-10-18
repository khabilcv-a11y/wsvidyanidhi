-- Vidyanidhi portal: Phase 0/1 foundation
-- Run once in Supabase Dashboard > SQL Editor (or `supabase db push`).
-- Roles: applicant | verifier | admin | master. Enforced here, not only in the UI.

-- ---------------------------------------------------------------- tables

create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  full_name      text,
  phone          text,
  role           text not null default 'applicant'
                 check (role in ('applicant','verifier','admin','master')),
  district_scope text[] not null default '{}',      -- empty = all districts
  finance        boolean not null default false,
  allow_password boolean not null default false,    -- staff may use password login
  language       text not null default 'en' check (language in ('en','ml')),
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table public.staff_invites (
  email          text primary key,
  role           text not null check (role in ('verifier','admin','master')),
  district_scope text[] not null default '{}',
  finance        boolean not null default false,
  created_at     timestamptz not null default now()
);

create table public.cycles (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,               -- application number prefix, e.g. '26'
  name         text not null,
  is_open      boolean not null default false,
  opens_on     date,
  closes_on    date,
  next_serial  int not null default 1,
  created_at   timestamptz not null default now()
);

create table public.document_types (
  id        uuid primary key default gen_random_uuid(),
  code      text not null unique,
  label_en  text not null,
  label_ml  text not null,
  required  boolean not null default true,
  sort      int not null default 0,
  active    boolean not null default true
);

create table public.applicants (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  full_name           text,
  gender              text check (gender in ('male','female','other')),
  dob                 date,
  district            text,
  address             text,
  phone               text,
  whatsapp            text,
  guardian_name       text,
  guardian_phone      text,
  guardian_occupation text,
  family_income       numeric,
  legacy_application_no text,                      -- for imported 2026 records
  updated_at          timestamptz not null default now()
);

create table public.applications (
  id              uuid primary key default gen_random_uuid(),
  applicant_id    uuid not null references public.applicants(user_id) on delete cascade,
  cycle_id        uuid not null references public.cycles(id),
  application_no  text unique,
  status          text not null default 'draft' check (status in (
                    'draft','submitted','documents_requested','under_verification',
                    'interview_scheduled','decision_pending','selected','active',
                    'renewal_due','renewal_review','not_selected','waitlisted',
                    'on_hold','discontinued','completed')),
  course          text,
  subject         text,
  course_type     text check (course_type in ('self_financing','aided','government')),
  stream          text,
  duration_years  numeric,
  year_of_study   int,
  completion_month text,                           -- 'YYYY-MM'
  university      text,
  college         text,
  last_exam       text,
  last_exam_year  int,
  last_percentage numeric,
  submitted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (applicant_id, cycle_id)
);

create table public.documents (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  doc_type_id     uuid not null references public.document_types(id),
  path            text not null,
  status          text not null default 'under_review'
                  check (status in ('under_review','accepted','reupload')),
  reason          text,
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  version         int not null default 1,
  uploaded_at     timestamptz not null default now()
);
create index on public.documents (application_id, doc_type_id);

create table public.pending_items (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  kind            text not null,                   -- document | reupload | profile | bank | renewal | meet
  title           text not null,
  doc_type_id     uuid references public.document_types(id),
  due_on          date,
  status          text not null default 'open' check (status in ('open','closed')),
  created_at      timestamptz not null default now(),
  closed_at       timestamptz
);

-- Email queue. An edge function (Phase 1b) sends queued rows through Gmail SMTP.
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,
  subject     text not null,
  body        text not null,
  status      text not null default 'queued' check (status in ('queued','sent','failed')),
  error       text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index on public.notifications (status, created_at);

create table public.consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  kind           text not null default 'privacy',
  version        text not null,
  is_minor       boolean not null default false,
  guardian_name  text,
  given_at       timestamptz not null default now()
);

create table public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       uuid,
  action      text not null,
  table_name  text not null,
  row_id      text,
  old_data    jsonb,
  new_data    jsonb
);

-- ---------------------------------------------------------------- helpers

-- Staff access requires an active admin/master profile AND a Google (OAuth) sign-in,
-- unless the master has allowed password login for that person.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select p.active and p.role in ('admin','master')
       and (p.allow_password or exists (
             select 1 from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) a
             where a ->> 'method' in ('oauth','sso/saml')))
    from public.profiles p where p.id = auth.uid()), false)
$$;

create or replace function public.is_master() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff() and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master')
$$;

create or replace function public.is_finance() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff() and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.role = 'master' or p.finance))
$$;

create or replace function public.in_my_scope(d text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff() and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (cardinality(p.district_scope) = 0 or d = any (p.district_scope)))
$$;

-- ---------------------------------------------------------------- new user -> profile (+ staff invite)

create or replace function public.handle_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare inv public.staff_invites%rowtype;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email),
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;

  -- Staff roles are granted only once the email is confirmed, so nobody can claim
  -- an invite by signing up with someone else's address.
  if new.email_confirmed_at is not null then
    select * into inv from public.staff_invites where email = lower(new.email);
    if found then
      update public.profiles
         set role = inv.role, district_scope = inv.district_scope, finance = inv.finance
       where id = new.id;
      delete from public.staff_invites where email = inv.email;
    end if;
  end if;
  return new;
end $$;

create trigger on_auth_user_change
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.handle_auth_user();

-- ---------------------------------------------------------------- guards

create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_master() and (
       new.role <> old.role or new.district_scope <> old.district_scope
    or new.finance <> old.finance or new.allow_password <> old.allow_password
    or new.active <> old.active or new.email <> old.email) then
    raise exception 'Only the master admin can change roles or access.';
  end if;
  return new;
end $$;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile();

create or replace function public.protect_application() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff()
     and coalesce(current_setting('app.bypass_protect', true), '') <> '1' and (
       new.application_no is distinct from old.application_no
    or new.cycle_id <> old.cycle_id or new.applicant_id <> old.applicant_id
    or new.submitted_at is distinct from old.submitted_at) then
    raise exception 'These fields cannot be changed.';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger protect_application before update on public.applications
  for each row execute function public.protect_application();

create or replace function public.document_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select coalesce(max(version), 0) + 1 into new.version
    from public.documents where application_id = new.application_id and doc_type_id = new.doc_type_id;
  update public.pending_items
     set status = 'closed', closed_at = now()
   where application_id = new.application_id and doc_type_id = new.doc_type_id and status = 'open';
  return new;
end $$;
create trigger document_version before insert on public.documents
  for each row execute function public.document_version();

create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (actor, action, table_name, row_id, old_data, new_data)
  values (auth.uid(), tg_op, tg_table_name,
          coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'user_id',
                   to_jsonb(old) ->> 'id', to_jsonb(old) ->> 'user_id'),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

create trigger audit_profiles     after insert or update or delete on public.profiles     for each row execute function public.audit_row();
create trigger audit_applicants   after insert or update or delete on public.applicants   for each row execute function public.audit_row();
create trigger audit_applications after insert or update or delete on public.applications for each row execute function public.audit_row();
create trigger audit_documents    after insert or update or delete on public.documents    for each row execute function public.audit_row();

-- ---------------------------------------------------------------- actions (called from the app)

create or replace function public.submit_application(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare a public.applications%rowtype; c public.cycles%rowtype; n int; t record; u public.profiles%rowtype;
begin
  perform set_config('app.bypass_protect', '1', true);  -- this function may assign the number
  select * into a from public.applications where id = p_id and applicant_id = auth.uid();
  if not found then raise exception 'Application not found.'; end if;
  if a.status not in ('draft','documents_requested') then raise exception 'Already submitted.'; end if;
  select * into c from public.cycles where id = a.cycle_id;
  if a.application_no is null and not c.is_open then raise exception 'Applications are closed.'; end if;
  if a.course is null or a.college is null then raise exception 'Please complete the course details first.'; end if;

  if a.application_no is null then
    update public.cycles set next_serial = next_serial + 1 where id = c.id returning next_serial - 1 into n;
    update public.applications
       set application_no = c.code || lpad(n::text, 4, '0'), submitted_at = now()
     where id = p_id;
  end if;
  update public.applications set status = 'submitted' where id = p_id;

  -- one pending item per required document that has not been uploaded
  for t in select * from public.document_types dt
           where dt.required and dt.active
             and not exists (select 1 from public.documents d where d.application_id = p_id and d.doc_type_id = dt.id)
             and not exists (select 1 from public.pending_items pi
                             where pi.application_id = p_id and pi.doc_type_id = dt.id and pi.status = 'open')
  loop
    insert into public.pending_items (application_id, kind, title, doc_type_id, due_on)
    values (p_id, 'document', t.label_en, t.id, current_date + 7);
  end loop;

  select * into u from public.profiles where id = auth.uid();
  insert into public.notifications (user_id, kind, subject, body)
  values (auth.uid(), 'submitted', 'Vidyanidhi application received',
          'Your application has been received. Sign in to the portal to see what is pending and to upload any missing documents.');
  return (select application_no from public.applications where id = p_id);
end $$;

create or replace function public.review_document(p_doc uuid, p_decision text, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare d public.documents%rowtype; a public.applications%rowtype; dt public.document_types%rowtype;
begin
  if not public.is_staff() then raise exception 'Not allowed.'; end if;
  if p_decision not in ('accepted','reupload') then raise exception 'Bad decision.'; end if;
  if p_decision = 'reupload' and coalesce(trim(p_reason), '') = '' then raise exception 'A reason is required.'; end if;
  select * into d from public.documents where id = p_doc;
  select * into a from public.applications where id = d.application_id;
  if not public.in_my_scope((select district from public.applicants where user_id = a.applicant_id)) then
    raise exception 'Outside your district scope.';
  end if;
  select * into dt from public.document_types where id = d.doc_type_id;

  update public.documents
     set status = p_decision, reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_doc;

  if p_decision = 'reupload' then
    update public.applications set status = 'documents_requested' where id = a.id and status in ('submitted','documents_requested');
    insert into public.pending_items (application_id, kind, title, doc_type_id, due_on)
    values (a.id, 'reupload', 'Re-upload: ' || dt.label_en, dt.id, current_date + 7);
    insert into public.notifications (user_id, kind, subject, body)
    values (a.applicant_id, 'reupload', 'Please upload ' || dt.label_en || ' again',
            'Your ' || dt.label_en || ' needs to be uploaded again. Reason: ' || p_reason || '. Sign in to the portal to upload it.');
  end if;
end $$;

create or replace function public.set_application_status(p_app uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare a public.applications%rowtype;
begin
  if not public.is_staff() then raise exception 'Not allowed.'; end if;
  select * into a from public.applications where id = p_app;
  if not public.in_my_scope((select district from public.applicants where user_id = a.applicant_id)) then
    raise exception 'Outside your district scope.';
  end if;
  update public.applications set status = p_status where id = p_app;
end $$;

create or replace function public.invite_staff(p_email text, p_role text, p_scope text[], p_finance boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_master() then raise exception 'Only the master admin can do this.'; end if;
  if p_role not in ('verifier','admin','master') then raise exception 'Bad role.'; end if;
  if exists (select 1 from public.profiles where email = lower(p_email)) then
    update public.profiles
       set role = p_role, district_scope = coalesce(p_scope, '{}'), finance = p_finance, active = true
     where email = lower(p_email);
  else
    insert into public.staff_invites (email, role, district_scope, finance)
    values (lower(p_email), p_role, coalesce(p_scope, '{}'), p_finance)
    on conflict (email) do update
      set role = excluded.role, district_scope = excluded.district_scope, finance = excluded.finance;
  end if;
end $$;

-- ---------------------------------------------------------------- row-level security

alter table public.profiles       enable row level security;
alter table public.staff_invites  enable row level security;
alter table public.cycles         enable row level security;
alter table public.document_types enable row level security;
alter table public.applicants     enable row level security;
alter table public.applications   enable row level security;
alter table public.documents      enable row level security;
alter table public.pending_items  enable row level security;
alter table public.notifications  enable row level security;
alter table public.consents       enable row level security;
alter table public.audit_log      enable row level security;

-- profiles
create policy profiles_read_own    on public.profiles for select using (id = auth.uid());
create policy profiles_read_staff  on public.profiles for select
  using (public.is_master() or (public.is_staff() and role in ('verifier','admin','master')));
create policy profiles_update_own  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_master on public.profiles for update using (public.is_master());

-- staff_invites
create policy invites_master on public.staff_invites for all using (public.is_master()) with check (public.is_master());

-- cycles and document types: any signed-in user reads, master edits
create policy cycles_read  on public.cycles for select using (auth.uid() is not null);
create policy cycles_write on public.cycles for all using (public.is_master()) with check (public.is_master());
create policy doctypes_read  on public.document_types for select using (auth.uid() is not null);
create policy doctypes_write on public.document_types for all using (public.is_master()) with check (public.is_master());

-- applicants
create policy applicants_own_read   on public.applicants for select using (user_id = auth.uid());
create policy applicants_own_insert on public.applicants for insert with check (user_id = auth.uid());
create policy applicants_own_update on public.applicants for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy applicants_staff_read   on public.applicants for select using (public.in_my_scope(district));
create policy applicants_staff_update on public.applicants for update using (public.in_my_scope(district));

-- applications
create policy apps_own_read   on public.applications for select using (applicant_id = auth.uid());
create policy apps_own_insert on public.applications for insert
  with check (applicant_id = auth.uid() and status = 'draft' and application_no is null);
create policy apps_own_update on public.applications for update
  using (applicant_id = auth.uid() and status in ('draft','documents_requested'))
  with check (applicant_id = auth.uid() and status in ('draft','documents_requested'));
create policy apps_staff_read on public.applications for select
  using (public.in_my_scope((select a.district from public.applicants a where a.user_id = applicant_id)));
create policy apps_staff_update on public.applications for update
  using (public.in_my_scope((select a.district from public.applicants a where a.user_id = applicant_id)));

-- documents
create policy docs_own_read   on public.documents for select
  using (exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = auth.uid()));
create policy docs_own_insert on public.documents for insert
  with check (status = 'under_review'
              and exists (select 1 from public.applications a
                          where a.id = application_id and a.applicant_id = auth.uid()
                            and a.status in ('draft','submitted','documents_requested')));
create policy docs_staff_read on public.documents for select
  using (public.in_my_scope((select ap.district from public.applications a
                             join public.applicants ap on ap.user_id = a.applicant_id where a.id = application_id)));

-- pending items
create policy pending_own_read on public.pending_items for select
  using (exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = auth.uid()));
create policy pending_staff_read on public.pending_items for select
  using (public.in_my_scope((select ap.district from public.applications a
                             join public.applicants ap on ap.user_id = a.applicant_id where a.id = application_id)));

-- notifications (read only; rows are created by the functions above)
create policy notif_own_read   on public.notifications for select using (user_id = auth.uid());
create policy notif_staff_read on public.notifications for select using (public.is_staff());

-- consents
create policy consent_own_read   on public.consents for select using (user_id = auth.uid());
create policy consent_own_insert on public.consents for insert with check (user_id = auth.uid());
create policy consent_staff_read on public.consents for select using (public.is_staff());

-- audit log: master only
create policy audit_master on public.audit_log for select using (public.is_master());

-- ---------------------------------------------------------------- private file storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 2097152,
        array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy docs_storage_insert on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy docs_storage_read on storage.objects for select
  using (bucket_id = 'documents'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));

-- ---------------------------------------------------------------- starter data

insert into public.document_types (code, label_en, label_ml, required, sort) values
  ('qualification', 'Educational qualification certificate', 'വിദ്യാഭ്യാസ യോഗ്യതാ സർട്ടിഫിക്കറ്റ്', true, 1),
  ('fee_receipt',   'Fee payment receipt',                   'ഫീസ് അടച്ച രസീത്',                      true, 2),
  ('recommendation','Recommendation letter',                 'ശുപാർശക്കത്ത്',                         true, 3),
  ('ration_card',   'Ration card',                           'റേഷൻ കാർഡ്',                             true, 4);

insert into public.cycles (code, name, is_open) values ('26', 'Scheme 2026', true);
