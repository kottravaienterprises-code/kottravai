-- Rollback script for Full-Text Search migration

-- 1. Drop GIN index
DROP INDEX IF EXISTS idx_products_search_vector;

-- 2. Drop trigger
DROP TRIGGER IF EXISTS trg_products_search_vector_update ON products;

-- 3. Drop function
DROP FUNCTION IF EXISTS products_search_vector_update();

-- 4. Drop column
ALTER TABLE products DROP COLUMN IF EXISTS search_vector;
