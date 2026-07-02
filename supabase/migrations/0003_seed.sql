-- =====================================================================
--  Migration 0003 — Seed data (roles, default categories, settings)
-- =====================================================================

insert into public.roles (name, description) values
  ('owner', 'ເຈົ້າຂອງຮ້ານ — ເຂົ້າເຖິງທຸກຢ່າງ / Full access'),
  ('employee', 'ພະນັກງານ — ບັນທຶກລາຍຈ່າຍ / Limited access')
on conflict (name) do nothing;

-- Default expense categories (spec Module 5). is_system = cannot be deleted.
insert into public.expense_categories (name, icon, is_system) values
  ('ຄ່າຂົນສົ່ງ / Transportation', 'Truck', true),
  ('ຄ່ານ້ຳ / Water Bill', 'Droplet', true),
  ('ຄ່າໄຟຟ້າ / Electric Bill', 'Zap', true),
  ('ເງິນເດືອນພະນັກງານ / Employee Salary', 'Users', true),
  ('ອາກອນ / Tax', 'Landmark', true),
  ('ຄ່າເຊົ່າ / Rent', 'Home', true),
  ('ຄ່າແກັສ / Gas', 'Flame', true),
  ('ຄ່າຂີ້ເຫຍື້ອ / Garbage Collection', 'Trash2', true),
  ('ຄ່າສ້ອມແປງ / Repair', 'Wrench', true)
on conflict (name) do nothing;

-- Sample raw material & drink categories
insert into public.raw_material_categories (name) values
  ('ຊີ້ນ / Meat'), ('ຜັກ / Vegetables'), ('ອາຫານທະເລ / Seafood'),
  ('ເຄື່ອງປຸງ / Seasoning'), ('ເຂົ້າ&ແປ້ງ / Rice & Flour')
on conflict (name) do nothing;

insert into public.drink_categories (name) values
  ('ນ້ຳອັດລົມ / Soft Drink'), ('ເບຍ / Beer'),
  ('ນ້ຳ / Water'), ('ນ້ຳໝາກໄມ້ / Juice'), ('ກາເຟ&ຊາ / Coffee & Tea')
on conflict (name) do nothing;

-- Single settings row
insert into public.settings (id, restaurant_name, currency, language)
values (1, 'ຮ້ານບຸບເຟ້ ຫອມແຊບ', 'LAK', 'lo')
on conflict (id) do nothing;
