-- Merge Duplicate Medications - STANDALONE VERSION
-- Run this script by itself
-- Date: 2025-10-20

-- This will merge medications with same name, strength, and dosage_form
-- (ignoring whitespace differences like "500mg" vs "500 mg")

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
            LOWER(REPLACE(TRIM(name), ' ', '')) as normalized_name,
            LOWER(REPLACE(TRIM(strength), ' ', '')) as normalized_strength,
            LOWER(REPLACE(TRIM(dosage_form), ' ', '')) as normalized_form,
            array_agg(id ORDER BY created_at) as medication_ids,
            array_agg(name) as original_names
        FROM medications
        GROUP BY
            LOWER(REPLACE(TRIM(name), ' ', '')),
            LOWER(REPLACE(TRIM(strength), ' ', '')),
            LOWER(REPLACE(TRIM(dosage_form), ' ', ''))
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

    RAISE NOTICE '✅ Merge complete!';
END $$;

-- Verify: Check if Amoxicillin capsules were merged
SELECT
    m.id,
    m.name,
    m.strength,
    m.dosage_form,
    COUNT(i.id) as num_lots,
    COALESCE(SUM(i.qty_units), 0) as total_stock
FROM medications m
LEFT JOIN inventory i ON m.id = i.medication_id
WHERE LOWER(m.name) LIKE '%amoxicillin%'
GROUP BY m.id, m.name, m.strength, m.dosage_form
ORDER BY m.dosage_form, m.strength;

-- Expected result:
-- 1 row: Amoxicillin + 500 mg + capsule → 375 units (merged from 130 + 245)
-- 1 row: Amoxicillin caps + 500 mg + tablet → (whatever stock it had)