-- Safe starter content. These records are clearly generic and do not make dealer claims.

insert into public.categories (name, slug, description, sort_order, status) values
  ('Cold Insulation', 'cold-insulation', 'Materials for low-temperature systems and chilled-water applications.', 10, 'published'),
  ('Hot Insulation', 'hot-insulation', 'High-temperature insulation for industrial equipment and process systems.', 20, 'published'),
  ('HVAC Insulation', 'hvac-insulation', 'Thermal and condensation-control systems for HVAC services.', 30, 'published'),
  ('Acoustic Insulation', 'acoustic-insulation', 'Sound-control products for quieter, more comfortable environments.', 40, 'published'),
  ('Roof & PEB Insulation', 'roof-peb-insulation', 'Thermal solutions for roofs, sheds and pre-engineered buildings.', 50, 'published')
on conflict (slug) do update set name = excluded.name, description = excluded.description, status = excluded.status;

insert into public.applications (name, slug, summary, status) values
  ('Chilled Water Pipe Insulation', 'chilled-water-pipe-insulation', 'Control condensation and energy loss on chilled-water pipework.', 'published'),
  ('HVAC Duct Insulation', 'hvac-duct-insulation', 'Improve thermal control and acoustic comfort around duct systems.', 'published'),
  ('Industrial Process Insulation', 'industrial-process-insulation', 'Protect equipment performance in demanding plant environments.', 'published'),
  ('Underdeck Insulation', 'underdeck-insulation', 'Reduce heat gain beneath roofing systems.', 'published')
on conflict (slug) do update set name = excluded.name, summary = excluded.summary, status = excluded.status;

insert into public.industries (name, slug, summary, status) values
  ('Commercial Buildings', 'commercial-buildings', 'Comfort and energy efficiency for large commercial environments.', 'published'),
  ('Industrial Plants', 'industrial-plants', 'Reliable protection for process and utility equipment.', 'published'),
  ('Pharma & Healthcare', 'pharma-healthcare', 'Solutions for controlled, clean and temperature-sensitive spaces.', 'published'),
  ('Data Centres', 'data-centres', 'Thermal and acoustic performance for critical facilities.', 'published'),
  ('PEB & Warehousing', 'peb-warehousing', 'Building-envelope insulation for warehouses and sheds.', 'published')
on conflict (slug) do update set name = excluded.name, summary = excluded.summary, status = excluded.status;

insert into public.services (name, slug, summary, icon, status) values
  ('Technical Consultation', 'technical-consultation', 'Practical recommendations for your application and project conditions.', 'clipboard-check', 'published'),
  ('Material Supply', 'material-supply', 'Dependable supply of selected insulation material categories.', 'boxes', 'published'),
  ('Installation Support', 'installation-support', 'Professional site support for selected insulation systems.', 'wrench', 'published'),
  ('After-sales Support', 'after-sales-support', 'Responsive assistance after material supply and project handover.', 'headphones', 'published')
on conflict (slug) do update set name = excluded.name, summary = excluded.summary, icon = excluded.icon, status = excluded.status;
