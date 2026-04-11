-- Add marketing_hub permission to user_permissions table
ALTER TABLE user_permissions
ADD COLUMN IF NOT EXISTS marketing_hub permission_level DEFAULT 'none';

-- Add Marketing Hub advanced options for limited access
ALTER TABLE user_permissions
ADD COLUMN IF NOT EXISTS marketing_can_access_plan boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS marketing_can_access_operations boolean DEFAULT true;

-- Add MasterMind sub-tab access (The Brain, The Heart)
ALTER TABLE user_permissions
ADD COLUMN IF NOT EXISTS mastermind_can_access_brain boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mastermind_can_access_heart boolean DEFAULT true;