-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Households
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    calendar_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Household members
CREATE TABLE IF NOT EXISTS household_members (
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (household_id, user_id)
);

-- Invite tokens
CREATE TABLE IF NOT EXISTS invite_tokens (
    token TEXT PRIMARY KEY,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ,
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wrapped household encryption keys
CREATE TABLE IF NOT EXISTS wrapped_household_keys (
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wrapped_key TEXT NOT NULL,
    salt TEXT NOT NULL,
    algorithm TEXT NOT NULL DEFAULT 'AES-GCM-PBKDF2',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (household_id, user_id)
);

-- Calendar events (mirrored from local schedules for public feed access)
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    schedule_id TEXT NOT NULL,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    due_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue')),
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (household_id, schedule_id)
);

-- Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrapped_household_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Households: users can view households they are members of
CREATE POLICY "households_select_members"
    ON households FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM household_members WHERE household_members.household_id = households.id AND household_members.user_id = auth.uid()
    ));

CREATE POLICY "households_insert_owner"
    ON households FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "households_update_owner"
    ON households FOR UPDATE
    USING (owner_id = auth.uid());

-- Household members: members can view other members of their households
CREATE POLICY "household_members_select"
    ON household_members FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM household_members m WHERE m.household_id = household_members.household_id AND m.user_id = auth.uid()
    ));

CREATE POLICY "household_members_insert"
    ON household_members FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM household_members m WHERE m.household_id = household_members.household_id AND m.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM households h WHERE h.id = household_members.household_id AND h.owner_id = auth.uid()
    ));

-- Invite tokens: household members can view/create invites for their households
CREATE POLICY "invite_tokens_select"
    ON invite_tokens FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM household_members m WHERE m.household_id = invite_tokens.household_id AND m.user_id = auth.uid()
    ));

CREATE POLICY "invite_tokens_insert"
    ON invite_tokens FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM household_members m WHERE m.household_id = invite_tokens.household_id AND m.user_id = auth.uid()
    ));

CREATE POLICY "invite_tokens_update"
    ON invite_tokens FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM household_members m WHERE m.household_id = invite_tokens.household_id AND m.user_id = auth.uid()
    ));

-- Wrapped keys: only the owner user can read their own wrapped key
CREATE POLICY "wrapped_keys_select"
    ON wrapped_household_keys FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "wrapped_keys_insert"
    ON wrapped_household_keys FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Calendar events: household members can manage events; public read via token is handled in API
CREATE POLICY "calendar_events_select"
    ON calendar_events FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM household_members m WHERE m.household_id = calendar_events.household_id AND m.user_id = auth.uid()
    ));

CREATE POLICY "calendar_events_insert"
    ON calendar_events FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM household_members m WHERE m.household_id = calendar_events.household_id AND m.user_id = auth.uid()
    ));

CREATE POLICY "calendar_events_update"
    ON calendar_events FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM household_members m WHERE m.household_id = calendar_events.household_id AND m.user_id = auth.uid()
    ));

CREATE POLICY "calendar_events_delete"
    ON calendar_events FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM household_members m WHERE m.household_id = calendar_events.household_id AND m.user_id = auth.uid()
    ));

-- Push subscriptions
CREATE POLICY "push_subscriptions_select"
    ON push_subscriptions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM household_members m WHERE m.household_id = push_subscriptions.household_id AND m.user_id = auth.uid()
    ));

CREATE POLICY "push_subscriptions_insert"
    ON push_subscriptions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_delete"
    ON push_subscriptions FOR DELETE
    USING (user_id = auth.uid());

-- Storage bucket for encrypted backups
INSERT INTO storage.buckets (id, name, public) VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Allow household members to read/write their own backup files
CREATE POLICY "backups_select"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'backups' AND EXISTS (
        SELECT 1 FROM household_members m WHERE m.user_id = auth.uid() AND storage.objects.name LIKE m.household_id || '/%'
    ));

CREATE POLICY "backups_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'backups' AND EXISTS (
        SELECT 1 FROM household_members m WHERE m.user_id = auth.uid() AND storage.objects.name LIKE m.household_id || '/%'
    ));
