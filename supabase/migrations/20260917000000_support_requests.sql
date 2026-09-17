-- ============================================================
-- Support requests: problemas y sugerencias desde plataforma,
-- login o registro. Los adjuntos se guardan en bucket privado.
-- ============================================================

CREATE TABLE IF NOT EXISTS support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  auth_user_id uuid,
  request_type text NOT NULL CHECK (request_type IN ('problem', 'suggestion')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  source text NOT NULL CHECK (source IN ('platform', 'login', 'register')),
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  description text NOT NULL,
  attachment_path text,
  attachment_mime_type text,
  attachment_original_name text,
  attachment_original_size bigint,
  attachment_compressed_size bigint,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'closed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own support requests" ON support_requests;
CREATE POLICY "Users can view own support requests"
  ON support_requests FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND (
          p.role = 'super_admin'
          OR (p.role = 'admin' AND p.tenant_id = support_requests.tenant_id)
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_support_requests_tenant_id ON support_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON support_requests(created_at DESC);

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'support-attachments',
  'support-attachments',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
