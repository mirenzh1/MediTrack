-- Fix Duplicate Medications
-- Purpose: Merge duplicate medications that differ only by whitespace or capitalization
-- Date: 2025-10-20

-- Step 1: Find duplicates (case-insensitive, trimmed comparison)
SELECT
    LOWER(TRIM(name)) as normalized_name,
    LOWER(TRIM(strength)) as normalized_strength,
    LOWER(TRIM(dosage_form)) as normalized_form,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at) as medication_ids,
    array_agg(name) as original_names,
    array_agg(strength) as original_strengths
FROM medications
GROUP BY
    LOWER(TRIM(name)),
    LOWER(TRIM(strength)),
    LOWER(TRIM(dosage_form))
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Merge duplicate medications
-- For each duplicate set: keep oldest, move inventory to it, delete rest
DO $$
DECLARE
    duplicate_record RECORD;
    keep_id UUID;
    delete_ids UUID[];
    total_inventory_moved INTEGER := 0;
BEGIN
    -- Loop through each set of duplicates
    FOR duplicate_record IN
        SELECT
            LOWER(TRIM(name)) as normalized_name,
            LOWER(TRIM(strength)) as normalized_strength,
            LOWER(TRIM(dosage_form)) as normalized_form,
            array_agg(id ORDER BY created_at) as medication_ids,
            array_agg(name) as original_names
        FROM medications
        GROUP BY
            LOWER(TRIM(name)),
            LOWER(TRIM(strength)),
            LOWER(TRIM(dosage_form))
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the first medication (oldest by created_at)
        keep_id := duplicate_record.medication_ids[1];
        delete_ids := duplicate_record.medication_ids[2:];

        RAISE NOTICE 'Processing: % (% duplicates found)',
            duplicate_record.original_names[1],
            array_length(duplicate_record.medication_ids, 1);

        -- Update all inventory records pointing to duplicate medications
        UPDATE inventory
        SET medication_id = keep_id
        WHERE medication_id = ANY(delete_ids);

        GET DIAGNOSTICS total_inventory_moved = ROW_COUNT;
        RAISE NOTICE '  → Moved % inventory records to medication ID: %', total_inventory_moved, keep_id;

        -- Update dispensing_logs if they reference the duplicate medications
        UPDATE dispensing_logs
        SET medication_id = keep_id
        WHERE medication_id = ANY(delete_ids);

        -- Normalize the name/strength in the kept medication (remove extra spaces)
        UPDATE medications
        SET
            name = TRIM(name),
            strength = TRIM(strength),
            dosage_form = TRIM(dosage_form)
        WHERE id = keep_id;

        -- Delete the duplicate medications
        DELETE FROM medications
        WHERE id = ANY(delete_ids);

        RAISE NOTICE '  → Deleted % duplicate medication records', array_length(delete_ids, 1);
        RAISE NOTICE '';

    END LOOP;
END $$;

-- Step 3: Verify no duplicates remain
SELECT
    LOWER(TRIM(name)) as normalized_name,
    LOWER(TRIM(strength)) as normalized_strength,
    LOWER(TRIM(dosage_form)) as normalized_form,
    COUNT(*) as count
FROM medications
GROUP BY
    LOWER(TRIM(name)),
    LOWER(TRIM(strength)),
    LOWER(TRIM(dosage_form))
HAVING COUNT(*) > 1;

-- Should return no rows if successful

-- Step 4: Show medications with their total stock after merge
SELECT
    m.name,
    m.strength,
    m.dosage_form,
    COUNT(i.id) as num_lots,
    COALESCE(SUM(i.qty_units), 0) as total_stock
FROM medications m
LEFT JOIN inventory i ON m.id = i.medication_id
GROUP BY m.id, m.name, m.strength, m.dosage_form
ORDER BY m.name, m.strength;

-- Step 5: Specific check for Amoxicillin
SELECT
    m.id,
    m.name,
    m.strength,
    m.dosage_form,
    COUNT(i.id) as num_lots,
    COALESCE(SUM(i.qty_units), 0) as total_stock,
    array_agg(i.qty_units) as individual_lot_quantities
FROM medications m
LEFT JOIN inventory i ON m.id = i.medication_id
WHERE LOWER(m.name) LIKE '%amoxicillin%'
  AND LOWER(m.strength) LIKE '%500%'
GROUP BY m.id, m.name, m.strength, m.dosage_form;

-- After merge, should only have ONE Amoxicillin 500mg entry with combined stock (130 + 245 = 375)