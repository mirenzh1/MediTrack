-- Create inventory_items table for lot number tracking
-- Each row represents a unique lot number for a medication at a specific site

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    lot_number TEXT NOT NULL,
    expiration_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    site_id UUID REFERENCES clinic_sites(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Ensure one lot number per medication (lot numbers are unique per medication)
    UNIQUE(medication_id, lot_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_medication ON inventory_items(medication_id);
CREATE INDEX IF NOT EXISTS idx_inventory_expiration ON inventory_items(expiration_date);
CREATE INDEX IF NOT EXISTS idx_inventory_site ON inventory_items(site_id);
CREATE INDEX IF NOT EXISTS idx_inventory_lot ON inventory_items(lot_number);

-- Create trigger for updated_at
CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Authenticated users can access inventory_items"
    ON inventory_items
    FOR ALL
    USING (auth.uid() IS NOT NULL);

-- Add comment
COMMENT ON TABLE inventory_items IS 'Tracks individual lot numbers for medications with quantities and expiration dates. One lot number = one expiration date.';
COMMENT ON COLUMN inventory_items.lot_number IS 'Unique lot/batch number from manufacturer (e.g., EW0646, 11953A)';
COMMENT ON COLUMN inventory_items.quantity IS 'Current quantity available for this specific lot';
COMMENT ON COLUMN inventory_items.expiration_date IS 'Expiration date for this lot (one-to-one with lot_number)';