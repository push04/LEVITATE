-- Add company_id to whatsapp_queue so businesses can send via the shared daemon
alter table whatsapp_queue add column if not exists company_id uuid references companies(id) on delete set null;
alter table whatsapp_queue add column if not exists campaign_id uuid;
alter table whatsapp_queue add column if not exists contact_name text;

create index if not exists idx_whatsapp_queue_company_id on whatsapp_queue(company_id);
create index if not exists idx_whatsapp_queue_status on whatsapp_queue(status);
