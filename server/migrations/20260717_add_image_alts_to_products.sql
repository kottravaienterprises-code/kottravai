-- Migration: Add image_alts JSONB column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_alts JSONB DEFAULT '{}'::jsonb;
