-- Remove Site and Team References
-- Purpose: Simplify database by removing clinic_sites and pharmacy_teams
-- Date: 2025-10-20
-- IMPORTANT: Run this in Supabase SQL Editor AFTER database_cleanup_migration.sql

-- Step 1: Drop foreign key constraints that reference clinic_sites
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_site_id_fkey CASCADE;
ALTER TABLE dispensing_logs DROP CONSTRAINT IF EXISTS dispensing_logs_clinic_site_id_fkey CASCADE;

-- Step 2: Remove site_id column from inventory table
ALTER TABLE inventory DROP COLUMN IF EXISTS site_id CASCADE;

-- Step 3: Remove clinic_site_id and pharmacy_log_team columns from dispensing_logs
ALTER TABLE dispensing_logs DROP COLUMN IF EXISTS clinic_site_id CASCADE;
ALTER TABLE dispensing_logs DROP COLUMN IF EXISTS pharmacy_log_team CASCADE;
ALTER TABLE dispensing_logs DROP COLUMN IF EXISTS log_page CASCADE;

-- Step 4: Drop pharmacy_teams table (not needed - single team)
DROP TABLE IF EXISTS pharmacy_teams CASCADE;

-- Step 5: Drop clinic_sites table (not needed - single site)
DROP TABLE IF EXISTS clinic_sites CASCADE;

-- Step 6: Keep important tables (audit_logs, import_sessions, dispensing_history)
-- These are for compliance, bulk imports, and historical tracking
-- DO NOT DROP: audit_logs, import_sessions, dispensing_history

-- Step 7: Update inventory unique constraint (remove site_id from it)
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_unique_lot CASCADE;

-- Recreate unique constraint without site_id
-- Ensures same lot number + expiration + medication can't be duplicated
ALTER TABLE inventory ADD CONSTRAINT inventory_unique_lot
  UNIQUE (medication_id, lot_number, expiration_date);

-- Step 8: Verify the cleanup
SELECT 'inventory' as table_name, COUNT(*) as row_count FROM inventory
UNION ALL
SELECT 'medications' as table_name, COUNT(*) as row_count FROM medications
UNION ALL
SELECT 'dispensing_logs' as table_name, COUNT(*) as row_count FROM dispensing_logs
UNION ALL
SELECT 'users' as table_name, COUNT(*) as row_count FROM users;

-- Show remaining columns in inventory
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'inventory'
ORDER BY ordinal_position;

-- Show remaining columns in dispensing_logs
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'dispensing_logs'
ORDER BY ordinal_position;

-- Cleanup Complete!
--
-- FINAL TABLES:
-- 1. medications (id, name, strength, dosage_form, is_active, created_at)
-- 2. inventory (id, medication_id, lot_number, expiration_date, qty_units, low_stock_threshold, notes, created_at, updated_at)
-- 3. dispensing_logs (id, log_date, patient_id, medication_id, medication_name, dose_instructions, lot_number, expiration_date, amount_dispensed, physician_name, student_name, entered_by, notes, created_at, updated_at)
-- 4. users (id, email, password_hash, role, first_name, last_name, is_active, created_at)