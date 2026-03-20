-- Citizen / responder phone for tel: links on emergencies.
alter table public.emergencies
  add column if not exists citizen_phone text;

alter table public.emergencies
  add column if not exists responder_phone text;
