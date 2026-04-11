-- Add sort_order to brain_documents
ALTER TABLE brain_documents 
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Add sort_order to heart_rules  
ALTER TABLE heart_rules 
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Initialize existing brain_documents with sort order based on creation date
UPDATE brain_documents 
SET sort_order = subq.rn 
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn 
  FROM brain_documents
) subq 
WHERE brain_documents.id = subq.id;

-- Initialize existing heart_rules with sort order based on creation date
UPDATE heart_rules 
SET sort_order = subq.rn 
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn 
  FROM heart_rules
) subq 
WHERE heart_rules.id = subq.id;