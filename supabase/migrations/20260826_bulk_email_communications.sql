/*
  # CIGÜEÑA — Comunicaciones masivas
  Historial de campañas y resultados por destinatario.
  Los envíos se crean exclusivamente desde la Netlify Function con service role.
*/

CREATE TABLE IF NOT EXISTS bulk_email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name text,
  created_by_email text,
  subject text NOT NULL,
  body_text text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sending'
    CHECK (status IN ('sending', 'sent', 'partial', 'failed')),
  include_platform_button boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS bulk_email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES bulk_email_campaigns(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  directory_id uuid,
  email text NOT NULL,
  full_name text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  provider_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulk_email_campaigns_tenant_created
  ON bulk_email_campaigns(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bulk_email_recipients_campaign
  ON bulk_email_recipients(campaign_id);

CREATE INDEX IF NOT EXISTS idx_bulk_email_recipients_tenant_email
  ON bulk_email_recipients(tenant_id, lower(email));

ALTER TABLE bulk_email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_email_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view bulk email campaigns" ON bulk_email_campaigns;
CREATE POLICY "Admins can view bulk email campaigns"
  ON bulk_email_campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles requester
      WHERE requester.auth_user_id = auth.uid()
        AND requester.status = 'active'
        AND (
          requester.role = 'super_admin'
          OR (requester.role = 'admin' AND requester.tenant_id = bulk_email_campaigns.tenant_id)
        )
    )
  );

DROP POLICY IF EXISTS "Admins can view bulk email recipients" ON bulk_email_recipients;
CREATE POLICY "Admins can view bulk email recipients"
  ON bulk_email_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles requester
      WHERE requester.auth_user_id = auth.uid()
        AND requester.status = 'active'
        AND (
          requester.role = 'super_admin'
          OR (requester.role = 'admin' AND requester.tenant_id = bulk_email_recipients.tenant_id)
        )
    )
  );

COMMENT ON TABLE bulk_email_campaigns IS
  'Historial de comunicaciones masivas enviadas por Admin o Superadmin.';

COMMENT ON TABLE bulk_email_recipients IS
  'Resultado individual por destinatario para una comunicación masiva.';
