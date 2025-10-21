-- Fix Duplicate Inventory Lots
-- Purpose: Merge duplicate inventory lots before creating unique constraint
-- Date: 2025-10-20

-- Step 1: Find all duplicates
SELECT
    medication_id,
    lot_number,
    expiration_date,
    COUNT(*) as duplicate_count,
    SUM(qty_units) as total_qty,
    array_agg(id) as lot_ids
FROM inventory
GROUP BY medication_id, lot_number, expiration_date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Merge duplicates - keep first, update quantity, delete rest
-- This creates a temporary function to handle the merge
DO $$
DECLARE
    duplicate_record RECORD;
    first_id UUID;
    total_quantity INTEGER;
BEGIN
    -- Loop through each set of duplicates
    FOR duplicate_record IN
        SELECT
            medication_id,
            lot_number,
            expiration_date,
            array_agg(id ORDER BY created_at) as lot_ids,
            SUM(qty_units) as total_qty
        FROM inventory
        GROUP BY medication_id, lot_number, expiration_date
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the first lot (oldest by created_at)
        first_id := duplicate_record.lot_ids[1];
        total_quantity := duplicate_record.total_qty;

        -- Update the first lot with total quantity
        UPDATE inventory
        SET qty_units = total_quantity,
            notes = COALESCE(notes, '') || ' [Merged from ' || (array_length(duplicate_record.lot_ids, 1) - 1) || ' duplicate lots]'
        WHERE id = first_id;

        -- Delete all other duplicates
        DELETE FROM inventory
        WHERE id = ANY(duplicate_record.lot_ids[2:]);

        RAISE NOTICE 'Merged % duplicate lots for lot_number % (kept ID: %, total qty: %)',
            array_length(duplicate_record.lot_ids, 1),
            duplicate_record.lot_number,
            first_id,
            total_quantity;
    END LOOP;
END $$;

-- Step 3: Verify no duplicates remain
SELECT
    medication_id,
    lot_number,
    expiration_date,
    COUNT(*) as count
FROM inventory
GROUP BY medication_id, lot_number, expiration_date
HAVING COUNT(*) > 1;

-- Should return no rows if successful

-- Step 4: Show final inventory counts
SELECT
    m.name,
    i.lot_number,
    i.expiration_date,
    i.qty_units
FROM inventory i
JOIN medications m ON i.medication_id = m.id
ORDER BY m.name, i.expiration_date;
