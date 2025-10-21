-- Database Cleanup Migration
-- Purpose: Remove old tables and rename _new tables to final names
-- Date: 2025-10-20
-- IMPORTANT: Run this in Supabase SQL Editor

-- Step 1: Drop ALL old and unused tables
-- These will CASCADE and drop their dependent foreign keys

-- Drop old medications and inventory variants
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS inventory_lots CASCADE;

-- Drop potentially unused tables (review first if needed)
-- Uncomment the ones you want to drop after verifying they're not needed
-- DROP TABLE IF EXISTS dispensing_history CASCADE;  -- May be duplicate of dispensing_logs
-- DROP TABLE IF EXISTS import_sessions CASCADE;     -- Not currently used
-- DROP TABLE IF EXISTS audit_logs CASCADE;          -- Not currently used
-- DROP TABLE IF EXISTS pharmacy_teams CASCADE;      -- Not currently used

-- Step 2: Drop views that reference the old table names
-- We'll recreate these later with correct table references
DROP VIEW IF EXISTS daily_dispensing_summary CASCADE;
DROP VIEW IF EXISTS expiring_inventory CASCADE;
DROP VIEW IF EXISTS inventory_by_site CASCADE;
DROP VIEW IF EXISTS inventory_lot_view CASCADE;
DROP VIEW IF EXISTS inventory_summary_view CASCADE;
DROP VIEW IF EXISTS medication_usage_report CASCADE;
DROP VIEW IF EXISTS physician_student_activity CASCADE;

-- Step 3: Rename medications_new to medications
ALTER TABLE medications_new RENAME TO medications;

-- Step 4: Rename inventory_new to inventory
ALTER TABLE inventory_new RENAME TO inventory;

-- Step 5: Update foreign key constraint names (cleaner naming)
ALTER TABLE inventory
  RENAME CONSTRAINT inventory_new_medication_id_fkey
  TO inventory_medication_id_fkey;

ALTER TABLE inventory
  RENAME CONSTRAINT inventory_new_site_id_fkey
  TO inventory_site_id_fkey;

ALTER TABLE inventory
  RENAME CONSTRAINT inventory_new_qty_positive
  TO inventory_qty_positive;

ALTER TABLE inventory
  RENAME CONSTRAINT inventory_new_pkey
  TO inventory_pkey;

ALTER TABLE inventory
  RENAME CONSTRAINT inventory_new_unique_lot
  TO inventory_unique_lot;

-- Step 6: Update index names (cleaner naming)
ALTER INDEX IF EXISTS idx_inventory_new_medication
  RENAME TO idx_inventory_medication;

ALTER INDEX IF EXISTS idx_inventory_new_expiration
  RENAME TO idx_inventory_expiration;

ALTER INDEX IF EXISTS idx_inventory_new_site
  RENAME TO idx_inventory_site;

ALTER INDEX IF EXISTS idx_inventory_new_lot
  RENAME TO idx_inventory_lot;

ALTER INDEX IF EXISTS idx_medications_new_name
  RENAME TO idx_medications_name;

ALTER INDEX IF EXISTS idx_medications_new_active
  RENAME TO idx_medications_active;

-- Step 7: Verify the migration
-- Run these queries to confirm:
SELECT 'medications' as table_name, COUNT(*) as row_count FROM medications
UNION ALL
SELECT 'inventory' as table_name, COUNT(*) as row_count FROM inventory
UNION ALL
SELECT 'dispensing_logs' as table_name, COUNT(*) as row_count FROM dispensing_logs
UNION ALL
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'clinic_sites' as table_name, COUNT(*) as row_count FROM clinic_sites;

-- Show foreign keys on inventory table
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'inventory';

-- Migration Complete!
--
-- NEXT STEPS:
-- 1. Frontend code already updated to use 'medications' and 'inventory'
-- 2. Views have been dropped - recreate them later when needed with correct table names
-- 3. Test the application to ensure all database operations work correctly
