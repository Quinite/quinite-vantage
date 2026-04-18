-- Migration: Fix sync_project_units trigger after properties -> units rename

-- Update sync function for units
CREATE OR REPLACE FUNCTION sync_project_units()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if unit is linked to a project
  IF NEW.project_id IS NOT NULL THEN
    -- Recalculate project unit counts based on actual units statuses
    UPDATE projects SET
      sold_units = (
        SELECT COUNT(*) FROM units 
        WHERE project_id = NEW.project_id AND status = 'sold'
      ),
      reserved_units = (
        SELECT COUNT(*) FROM units 
        WHERE project_id = NEW.project_id AND status = 'reserved'
      ),
      available_units = GREATEST(0, total_units - (
        SELECT COUNT(*) FROM units 
        WHERE project_id = NEW.project_id AND status IN ('sold', 'reserved')
      ))
    WHERE id = NEW.project_id;
  END IF;
  
  -- Also handle old project_id if it changed
  IF TG_OP = 'UPDATE' AND OLD.project_id IS NOT NULL AND OLD.project_id != NEW.project_id THEN
    UPDATE projects SET
      sold_units = (
        SELECT COUNT(*) FROM units 
        WHERE project_id = OLD.project_id AND status = 'sold'
      ),
      reserved_units = (
        SELECT COUNT(*) FROM units 
        WHERE project_id = OLD.project_id AND status = 'reserved'
      ),
      available_units = GREATEST(0, total_units - (
        SELECT COUNT(*) FROM units 
        WHERE project_id = OLD.project_id AND status IN ('sold', 'reserved')
      ))
    WHERE id = OLD.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update delete sync function
CREATE OR REPLACE FUNCTION sync_project_units_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.project_id IS NOT NULL THEN
    UPDATE projects SET
      sold_units = (
        SELECT COUNT(*) FROM units 
        WHERE project_id = OLD.project_id AND status = 'sold'
      ),
      reserved_units = (
        SELECT COUNT(*) FROM units 
        WHERE project_id = OLD.project_id AND status = 'reserved'
      ),
      available_units = GREATEST(0, total_units - (
        SELECT COUNT(*) FROM units 
        WHERE project_id = OLD.project_id AND status IN ('sold', 'reserved')
      ))
    WHERE id = OLD.project_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Ensure triggers are correctly named and pointing to the function
DROP TRIGGER IF EXISTS property_status_sync ON units;
CREATE TRIGGER property_status_sync
AFTER INSERT OR UPDATE OF status, project_id ON units
FOR EACH ROW
EXECUTE FUNCTION sync_project_units();

DROP TRIGGER IF EXISTS property_delete_sync ON units;
CREATE TRIGGER property_delete_sync
AFTER DELETE ON units
FOR EACH ROW
EXECUTE FUNCTION sync_project_units_on_delete();
