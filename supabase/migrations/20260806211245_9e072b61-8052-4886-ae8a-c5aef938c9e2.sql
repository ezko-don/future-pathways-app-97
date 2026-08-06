create policy "Users can read their own report files"
on storage.objects for select to authenticated
using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload their own report files"
on storage.objects for insert to authenticated
with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own report files"
on storage.objects for update to authenticated
using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

create table public.report_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  quiz_result_id uuid references public.quiz_results(id) on delete set null,
  recipient_email text not null,
  recipient_label text,
  pdf_path text,
  pdf_url text,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.report_deliveries to authenticated;
grant all on public.report_deliveries to service_role;

alter table public.report_deliveries enable row level security;

create policy "Users can view their own report deliveries"
on public.report_deliveries for select to authenticated
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_report_deliveries_updated_at
before update on public.report_deliveries
for each row execute function public.set_updated_at();