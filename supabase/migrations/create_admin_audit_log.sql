-- Create admin audit log table
CREATE TABLE IF NOT EXISTS tours_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_action CHECK (action IN (
    'approve_operator',
    'reject_operator',
    'approve_guide',
    'reject_guide',
    'update_package_status',
    'delete_package',
    'ban_user',
    'unban_user'
  )),
  
  CONSTRAINT valid_entity_type CHECK (entity_type IN (
    'operator',
    'guide',
    'package',
    'user',
    'booking'
  ))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON tours_admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON tours_admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON tours_admin_audit_log(created_at DESC);

-- RLS policies
ALTER TABLE tours_admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON tours_admin_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
  ON tours_admin_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    AND admin_id = auth.uid()
  );

-- Add comments
COMMENT ON TABLE tours_admin_audit_log IS 'Tracks all admin actions for accountability';
COMMENT ON COLUMN tours_admin_audit_log.action IS 'Type of action performed';
COMMENT ON COLUMN tours_admin_audit_log.entity_type IS 'Type of entity affected';
COMMENT ON COLUMN tours_admin_audit_log.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN tours_admin_audit_log.old_value IS 'Previous value (if applicable)';
COMMENT ON COLUMN tours_admin_audit_log.new_value IS 'New value after action';
COMMENT ON COLUMN tours_admin_audit_log.notes IS 'Admin notes or reason for action';
