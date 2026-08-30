-- Initial supporting records used by the Admin catalogue. This is a production
-- migration (not local test seed data), so it runs once and is tracked.

insert into public.applications (name, slug, summary, status) values
  ('Chilled Water Pipe Insulation', 'chilled-water-pipe-insulation', 'Control condensation and energy loss on chilled-water pipework.', 'published'),
  ('HVAC Duct Insulation', 'hvac-duct-insulation', 'Improve thermal control and acoustic comfort around duct systems.', 'published'),
  ('Industrial Process Insulation', 'industrial-process-insulation', 'Protect equipment performance in demanding plant environments.', 'published'),
  ('Underdeck Insulation', 'underdeck-insulation', 'Reduce heat gain beneath roofing systems.', 'published')
on conflict (slug) do update set
  name = excluded.name,
  summary = excluded.summary,
  status = excluded.status;

insert into public.industries (name, slug, summary, status) values
  ('Commercial Buildings', 'commercial-buildings', 'Comfort and energy efficiency for large commercial environments.', 'published'),
  ('Industrial Plants', 'industrial-plants', 'Reliable protection for process and utility equipment.', 'published'),
  ('Pharma & Healthcare', 'pharma-healthcare', 'Solutions for controlled, clean and temperature-sensitive spaces.', 'published'),
  ('Data Centres', 'data-centres', 'Thermal and acoustic performance for critical facilities.', 'published'),
  ('PEB & Warehousing', 'peb-warehousing', 'Building-envelope insulation for warehouses and sheds.', 'published')
on conflict (slug) do update set
  name = excluded.name,
  summary = excluded.summary,
  status = excluded.status;

insert into public.services (name, slug, summary, icon, status) values
  ('Technical Consultation', 'technical-consultation', 'Practical recommendations for your application and project conditions.', 'clipboard-check', 'published'),
  ('Material Supply', 'material-supply', 'Dependable supply of selected insulation material categories.', 'boxes', 'published'),
  ('Installation Support', 'installation-support', 'Professional site support for selected insulation systems.', 'wrench', 'published'),
  ('After-sales Support', 'after-sales-support', 'Responsive assistance after material supply and project handover.', 'headphones', 'published')
on conflict (slug) do update set
  name = excluded.name,
  summary = excluded.summary,
  icon = excluded.icon,
  status = excluded.status;
