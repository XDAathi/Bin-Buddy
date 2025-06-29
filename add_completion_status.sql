-- Add completion status field to waste_classifications table
ALTER TABLE waste_classifications 
ADD COLUMN completed BOOLEAN DEFAULT false;

-- Add index for completion status filtering
CREATE INDEX idx_waste_classifications_completed ON waste_classifications(completed);

-- Update any existing records to have completed = false (default)
UPDATE waste_classifications SET completed = false WHERE completed IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN waste_classifications.completed IS 'Tracks whether user has marked this item as disposed of/completed'; 