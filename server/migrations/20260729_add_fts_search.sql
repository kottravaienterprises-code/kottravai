-- Migration to add Full-Text Search vector for products table
-- Up Script

-- 1. Add the search_vector column
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Create function to generate the search_vector
-- Weights:
-- A: Exact name / prefix
-- B: Category
-- C: Description / Short Description
CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.short_description, '') || ' ' || COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 3. Update existing rows to populate search_vector
UPDATE products SET search_vector = 
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(category, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(short_description, '') || ' ' || COALESCE(description, '')), 'C');

-- 4. Create trigger to keep it updated automatically
DROP TRIGGER IF EXISTS trg_products_search_vector_update ON products;
CREATE TRIGGER trg_products_search_vector_update
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE PROCEDURE products_search_vector_update();

-- 5. Create GIN Index
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING GIN(search_vector);
