CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  unit TEXT NOT NULL DEFAULT '1 kg',
  price REAL NOT NULL DEFAULT 0,
  in_stock INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);

INSERT INTO items (name, category, unit, price) VALUES
('Rice (Sona Masoori)', 'Rice & Atta', '1 kg', 58),
('Wheat Atta', 'Rice & Atta', '1 kg', 45),
('Toor Dal', 'Dals', '1 kg', 160),
('Moong Dal', 'Dals', '1 kg', 120),
('Chana Dal', 'Dals', '1 kg', 90),
('Sunflower Oil', 'Oil & Ghee', '1 litre', 135),
('Groundnut Oil', 'Oil & Ghee', '1 litre', 185),
('Ghee', 'Oil & Ghee', '500 ml', 330),
('Sugar', 'Staples', '1 kg', 46),
('Salt', 'Staples', '1 kg', 22),
('Tamarind', 'Staples', '250 g', 60),
('Turmeric Powder', 'Masalas', '100 g', 40),
('Red Chilli Powder', 'Masalas', '100 g', 55),
('Coriander Powder', 'Masalas', '100 g', 35),
('Tea Powder', 'Beverages', '250 g', 120),
('Coffee Powder', 'Beverages', '200 g', 150),
('Bath Soap', 'Household', '1 piece', 38),
('Detergent Powder', 'Household', '1 kg', 110),
('Biscuits', 'Snacks', '1 packet', 10),
('Noodles', 'Snacks', '1 packet', 14);