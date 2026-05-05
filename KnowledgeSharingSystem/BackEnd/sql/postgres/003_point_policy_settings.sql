CREATE TABLE IF NOT EXISTS point_policy_settings (
    setting_key VARCHAR(80) PRIMARY KEY,
    setting_value INTEGER NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'custom',
    label VARCHAR(120) NULL,
    description VARCHAR(255) NULL,
    updated_by_user_id INTEGER NULL REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE point_policy_settings
    ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'custom';
ALTER TABLE point_policy_settings
    ADD COLUMN IF NOT EXISTS label VARCHAR(120) NULL;
ALTER TABLE point_policy_settings
    ADD COLUMN IF NOT EXISTS unit VARCHAR(40) NULL;
ALTER TABLE point_policy_settings
    ADD COLUMN IF NOT EXISTS min_value INTEGER NOT NULL DEFAULT -100000;
ALTER TABLE point_policy_settings
    ADD COLUMN IF NOT EXISTS max_value INTEGER NOT NULL DEFAULT 100000;

DO $$
DECLARE constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'point_policy_settings'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%setting_value%'
    LOOP
        EXECUTE format('ALTER TABLE point_policy_settings DROP CONSTRAINT %I', constraint_record.conname);
    END LOOP;
END $$;

ALTER TABLE point_policy_settings
    ADD CONSTRAINT ck_point_policy_settings_value
    CHECK (setting_value BETWEEN -100000 AND 100000);
