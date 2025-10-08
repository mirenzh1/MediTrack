-- ============================================================================
-- REVISED DATABASE SCHEMA FOR TESTING
-- ============================================================================
-- This script creates NEW tables (medications_new, inventory_new) with improved structure
-- WITHOUT modifying existing tables, for testing purposes
--
-- Key Changes:
-- 1. medications_new: REMOVED current_stock, notes, is_available, last_updated
--    - Only tracks medication metadata (name, strength, dosage_form)
-- 2. inventory_new: ADDED lot_number, expiration_date directly
--    - Each unique combination of (medication_id, site_id, lot_number, expiration_date)
--      gets its own record
--    - Eliminates the need for inventory_lots table
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create medications_new table (simplified - no stock tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medications_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    strength TEXT,
    dosage_form TEXT DEFAULT 'tablet',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Optional: Add constraint to prevent duplicate medications
    CONSTRAINT medications_new_unique_combo UNIQUE (name, strength, dosage_form)
);

COMMENT ON TABLE medications_new IS 'Simplified medication formulary - metadata only, no stock tracking';
COMMENT ON COLUMN medications_new.name IS 'Generic medication name (e.g., Amlodipine, Naproxen)';
COMMENT ON COLUMN medications_new.strength IS 'Medication strength (e.g., 5mg, 375mg, 500mg)';
COMMENT ON COLUMN medications_new.dosage_form IS 'Form: tablet, capsule, drops, syrup, etc.';

-- ----------------------------------------------------------------------------
-- 2. Create inventory_new table (with lot tracking built-in)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID NOT NULL REFERENCES medications_new(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES clinic_sites(id) ON DELETE CASCADE,

    -- Lot tracking fields (moved from inventory_lots)
    lot_number TEXT NOT NULL,
    expiration_date DATE NOT NULL,

    -- Quantity tracking
    qty_units INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique combination of medication + site + lot + expiration
    CONSTRAINT inventory_new_unique_lot UNIQUE (medication_id, site_id, lot_number, expiration_date),

    -- Ensure quantity is not negative
    CONSTRAINT inventory_new_qty_positive CHECK (qty_units >= 0)
);

COMMENT ON TABLE inventory_new IS 'Inventory tracking with lot numbers - each unique lot/expiration is a separate record';
COMMENT ON COLUMN inventory_new.lot_number IS 'Manufacturer lot number (e.g., EW0646, 11953A)';
COMMENT ON COLUMN inventory_new.expiration_date IS 'Expiration date of this specific lot';
COMMENT ON COLUMN inventory_new.qty_units IS 'Current quantity in stock for this lot';
COMMENT ON COLUMN inventory_new.low_stock_threshold IS 'Alert threshold for this specific lot';

-- ----------------------------------------------------------------------------
-- 3. Create indexes for performance
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_medications_new_name ON medications_new(name);
CREATE INDEX IF NOT EXISTS idx_medications_new_active ON medications_new(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_inventory_new_medication ON inventory_new(medication_id);
CREATE INDEX IF NOT EXISTS idx_inventory_new_site ON inventory_new(site_id);
CREATE INDEX IF NOT EXISTS idx_inventory_new_expiration ON inventory_new(expiration_date);
CREATE INDEX IF NOT EXISTS idx_inventory_new_low_stock ON inventory_new(qty_units, low_stock_threshold)
    WHERE qty_units <= low_stock_threshold;

-- ----------------------------------------------------------------------------
-- 4. Create trigger for updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_inventory_new_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inventory_new_updated_at
    BEFORE UPDATE ON inventory_new
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_new_timestamp();

-- ----------------------------------------------------------------------------
-- 5. Migrate sample data from existing tables
-- ----------------------------------------------------------------------------

-- Copy medications (removing stock-related fields)
-- Only copy the first occurrence of each unique (name, strength, dosage_form) combo
INSERT INTO medications_new (id, name, strength, dosage_form, is_active, created_at)
SELECT DISTINCT ON (name, strength, dosage_form)
    id,
    name,
    strength,
    dosage_form,
    is_active,
    created_at
FROM medications
ORDER BY name, strength, dosage_form, created_at ASC
ON CONFLICT (name, strength, dosage_form) DO NOTHING;

-- Create sample inventory records from existing data
-- Strategy: For each medication with current_stock > 0, create inventory records
-- with sample lot numbers and expiration dates

-- First, let's get a clinic site to use
DO $$
DECLARE
    sample_site_id UUID;
BEGIN
    -- Get the first active clinic site
    SELECT id INTO sample_site_id
    FROM clinic_sites
    WHERE is_active = true
    LIMIT 1;

    -- If no site exists, create a default one
    IF sample_site_id IS NULL THEN
        INSERT INTO clinic_sites (site_name, clinic_date, is_active)
        VALUES ('Default Testing Site', CURRENT_DATE, true)
        RETURNING id INTO sample_site_id;
    END IF;

    -- Migrate inventory data
    -- For medications with current_stock, create inventory records
    -- Use medications_new as source (which has deduplicated medications)
    INSERT INTO inventory_new (
        medication_id,
        site_id,
        lot_number,
        expiration_date,
        qty_units,
        low_stock_threshold,
        notes
    )
    SELECT
        mn.id as medication_id,
        sample_site_id as site_id,
        'LOT-' || SUBSTRING(md5(mn.id::text), 1, 6) as lot_number,
        (CURRENT_DATE + INTERVAL '1 year')::DATE as expiration_date,
        COALESCE(MAX(m.current_stock), 0) as qty_units,  -- Use MAX in case of duplicates
        10 as low_stock_threshold,
        'Migrated from medications.current_stock' as notes
    FROM medications_new mn
    INNER JOIN medications m ON (
        LOWER(TRIM(mn.name)) = LOWER(TRIM(m.name))
        AND COALESCE(LOWER(TRIM(mn.strength)), '') = COALESCE(LOWER(TRIM(m.strength)), '')
        AND LOWER(TRIM(mn.dosage_form)) = LOWER(TRIM(m.dosage_form))
    )
    WHERE m.current_stock > 0
    GROUP BY mn.id, sample_site_id
    ON CONFLICT (medication_id, site_id, lot_number, expiration_date) DO NOTHING;

    -- Also extract lot numbers from dispensing_logs and create inventory records
    INSERT INTO inventory_new (
        medication_id,
        site_id,
        lot_number,
        expiration_date,
        qty_units,
        low_stock_threshold,
        notes
    )
    SELECT DISTINCT
        mn.id as medication_id,
        COALESCE(dl.clinic_site_id, sample_site_id) as site_id,
        dl.lot_number,
        -- Try to parse expiration_date (currently stored as text like "2/24", "4/26")
        CASE
            WHEN dl.expiration_date ~ '^\d{1,2}/\d{2}$' THEN
                -- Convert "2/24" to "2024-02-01"
                TO_DATE('20' || SPLIT_PART(dl.expiration_date, '/', 2) || '-' ||
                        LPAD(SPLIT_PART(dl.expiration_date, '/', 1), 2, '0') || '-01', 'YYYY-MM-DD')
            ELSE
                (CURRENT_DATE + INTERVAL '1 year')::DATE
        END as expiration_date,
        50 as qty_units,  -- Default quantity for imported lots
        10 as low_stock_threshold,
        'Extracted from dispensing_logs' as notes
    FROM dispensing_logs dl
    INNER JOIN medications_new mn ON LOWER(TRIM(dl.medication_name)) = LOWER(TRIM(mn.name || ' ' || COALESCE(mn.strength, '')))
    WHERE dl.lot_number IS NOT NULL
      AND dl.lot_number != ''
    ON CONFLICT (medication_id, site_id, lot_number, expiration_date) DO NOTHING;

END $$;

-- ----------------------------------------------------------------------------
-- 6. Create useful views for the new structure
-- ----------------------------------------------------------------------------

-- View: Total stock per medication across all lots and sites
CREATE OR REPLACE VIEW medication_stock_summary AS
SELECT
    m.id as medication_id,
    m.name,
    m.strength,
    m.dosage_form,
    COUNT(DISTINCT i.id) as total_lots,
    SUM(i.qty_units) as total_quantity,
    COUNT(DISTINCT i.site_id) as sites_stocked,
    MIN(i.expiration_date) as earliest_expiration,
    MAX(i.expiration_date) as latest_expiration,
    SUM(CASE WHEN i.qty_units <= i.low_stock_threshold THEN 1 ELSE 0 END) as low_stock_lots
FROM medications_new m
LEFT JOIN inventory_new i ON m.id = i.medication_id
GROUP BY m.id, m.name, m.strength, m.dosage_form
ORDER BY m.name, m.strength;

-- View: Expiring inventory (within next 6 months)
CREATE OR REPLACE VIEW expiring_inventory AS
SELECT
    i.id,
    m.name,
    m.strength,
    m.dosage_form,
    cs.site_name,
    i.lot_number,
    i.expiration_date,
    i.qty_units,
    (i.expiration_date - CURRENT_DATE) as days_until_expiration
FROM inventory_new i
JOIN medications_new m ON i.medication_id = m.id
JOIN clinic_sites cs ON i.site_id = cs.id
WHERE i.expiration_date <= (CURRENT_DATE + INTERVAL '6 months')
  AND i.qty_units > 0
ORDER BY i.expiration_date ASC;

-- View: Low stock alerts
CREATE OR REPLACE VIEW low_stock_alerts AS
SELECT
    i.id,
    m.name,
    m.strength,
    m.dosage_form,
    cs.site_name,
    i.lot_number,
    i.expiration_date,
    i.qty_units,
    i.low_stock_threshold,
    (i.low_stock_threshold - i.qty_units) as units_below_threshold
FROM inventory_new i
JOIN medications_new m ON i.medication_id = m.id
JOIN clinic_sites cs ON i.site_id = cs.id
WHERE i.qty_units <= i.low_stock_threshold
  AND i.qty_units > 0
ORDER BY units_below_threshold DESC, i.expiration_date ASC;

-- View: Inventory by site
CREATE OR REPLACE VIEW inventory_by_site AS
SELECT
    cs.id as site_id,
    cs.site_name,
    m.name as medication_name,
    m.strength,
    m.dosage_form,
    COUNT(i.id) as total_lots,
    SUM(i.qty_units) as total_quantity,
    MIN(i.expiration_date) as earliest_expiration
FROM clinic_sites cs
JOIN inventory_new i ON cs.id = i.site_id
JOIN medications_new m ON i.medication_id = m.id
GROUP BY cs.id, cs.site_name, m.name, m.strength, m.dosage_form
ORDER BY cs.site_name, m.name;

-- ----------------------------------------------------------------------------
-- 7. Create sample test data for demonstration
-- ----------------------------------------------------------------------------

-- Add a few test medications if table is empty
INSERT INTO medications_new (name, strength, dosage_form) VALUES
    ('Ibuprofen', '200mg', 'tablet'),
    ('Amoxicillin', '500mg', 'capsule'),
    ('Lisinopril', '10mg', 'tablet')
ON CONFLICT (name, strength, dosage_form) DO NOTHING;

-- Add test inventory with multiple lots per medication
DO $$
DECLARE
    test_site_id UUID;
    ibuprofen_id UUID;
    amoxicillin_id UUID;
    lisinopril_id UUID;
BEGIN
    -- Get or create test site
    SELECT id INTO test_site_id FROM clinic_sites WHERE is_active = true LIMIT 1;

    -- Get medication IDs
    SELECT id INTO ibuprofen_id FROM medications_new WHERE name = 'Ibuprofen' AND strength = '200mg' LIMIT 1;
    SELECT id INTO amoxicillin_id FROM medications_new WHERE name = 'Amoxicillin' AND strength = '500mg' LIMIT 1;
    SELECT id INTO lisinopril_id FROM medications_new WHERE name = 'Lisinopril' AND strength = '10mg' LIMIT 1;

    IF test_site_id IS NOT NULL THEN
        -- Ibuprofen - 3 different lots
        IF ibuprofen_id IS NOT NULL THEN
            INSERT INTO inventory_new (medication_id, site_id, lot_number, expiration_date, qty_units, low_stock_threshold)
            VALUES
                (ibuprofen_id, test_site_id, 'IBU001', '2025-12-31', 500, 50),
                (ibuprofen_id, test_site_id, 'IBU002', '2026-03-15', 300, 50),
                (ibuprofen_id, test_site_id, 'IBU003', '2026-06-30', 150, 50)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Amoxicillin - 2 lots, one low stock
        IF amoxicillin_id IS NOT NULL THEN
            INSERT INTO inventory_new (medication_id, site_id, lot_number, expiration_date, qty_units, low_stock_threshold)
            VALUES
                (amoxicillin_id, test_site_id, 'AMX101', '2025-11-20', 45, 50),  -- LOW STOCK
                (amoxicillin_id, test_site_id, 'AMX102', '2026-02-28', 200, 50)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Lisinopril - 1 lot, expiring soon
        IF lisinopril_id IS NOT NULL THEN
            INSERT INTO inventory_new (medication_id, site_id, lot_number, expiration_date, qty_units, low_stock_threshold)
            VALUES
                (lisinopril_id, test_site_id, 'LIS201', CURRENT_DATE + INTERVAL '2 months', 80, 30)  -- EXPIRING
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 8. Verification queries
-- ----------------------------------------------------------------------------

-- Count records
SELECT 'medications_new' as table_name, COUNT(*) as record_count FROM medications_new
UNION ALL
SELECT 'inventory_new' as table_name, COUNT(*) as record_count FROM inventory_new;

-- Show sample data
SELECT
    m.name,
    m.strength,
    m.dosage_form,
    i.lot_number,
    i.expiration_date,
    i.qty_units,
    cs.site_name
FROM medications_new m
LEFT JOIN inventory_new i ON m.id = i.medication_id
LEFT JOIN clinic_sites cs ON i.site_id = cs.id
ORDER BY m.name, i.expiration_date
LIMIT 20;

-- Show stock summary
SELECT * FROM medication_stock_summary LIMIT 10;

-- Show low stock alerts
SELECT * FROM low_stock_alerts;

-- Show expiring inventory
SELECT * FROM expiring_inventory LIMIT 10;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
--
-- After testing and validation, to apply this structure to production:
--
-- 1. Backup existing data:
--    - pg_dump or Supabase backup
--
-- 2. Rename tables:
--    ALTER TABLE medications RENAME TO medications_old;
--    ALTER TABLE inventory RENAME TO inventory_old;
--    ALTER TABLE inventory_lots RENAME TO inventory_lots_old;
--    ALTER TABLE medications_new RENAME TO medications;
--    ALTER TABLE inventory_new RENAME TO inventory;
--
-- 3. Update foreign key references in other tables:
--    - dispensing_logs.medication_id should reference medications(id)
--
-- 4. Update application code:
--    - src/services/medicationService.ts
--    - Update queries to use new structure
--
-- 5. Drop old tables after verification:
--    DROP TABLE IF EXISTS inventory_lots_old;
--    DROP TABLE IF EXISTS inventory_old;
--    DROP TABLE IF EXISTS medications_old;
--
-- ============================================================================
