-- Add stock tracking columns to medications table
ALTER TABLE medications
ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for stock queries
CREATE INDEX IF NOT EXISTS idx_medications_stock ON medications(current_stock);

-- Update comment
COMMENT ON COLUMN medications.current_stock IS 'Current available stock quantity (rounded from average use per year)';
COMMENT ON COLUMN medications.notes IS 'Additional information about the medication (avg use, package quantity, etc.)';
