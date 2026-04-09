-- Add color column to brain_categories
ALTER TABLE brain_categories ADD COLUMN IF NOT EXISTS color text DEFAULT 'indigo';

-- Update existing categories with default colors
UPDATE brain_categories SET color = 'blue' WHERE id = 'brand' AND color = 'indigo';
UPDATE brain_categories SET color = 'green' WHERE id = 'products' AND color = 'indigo';
UPDATE brain_categories SET color = 'purple' WHERE id = 'support' AND color = 'indigo';
UPDATE brain_categories SET color = 'amber' WHERE id = 'operations' AND color = 'indigo';