CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_idx ON email_verification_tokens(user_id);

CREATE TABLE IF NOT EXISTS login_verification_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS login_verification_tokens_user_idx ON login_verification_tokens(user_id);

CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES folders(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE folders ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE folders DROP CONSTRAINT IF EXISTS folders_unique_name_per_parent;
DROP INDEX IF EXISTS folders_unique_root_name_idx;
CREATE UNIQUE INDEX IF NOT EXISTS folders_owner_parent_name_idx ON folders(owner_id, parent_id, name) WHERE parent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS folders_owner_root_name_idx
    ON folders(owner_id, name)
    WHERE parent_id IS NULL;
CREATE INDEX IF NOT EXISTS folders_owner_parent_idx ON folders(owner_id, parent_id);

CREATE TABLE IF NOT EXISTS stored_files (
    id UUID PRIMARY KEY,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE RESTRICT,
    original_name VARCHAR(512) NOT NULL,
    storage_name VARCHAR(768) NOT NULL,
    size_bytes BIGINT NOT NULL,
    content_type VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE stored_files ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS stored_files_folder_id_idx ON stored_files(folder_id);
CREATE INDEX IF NOT EXISTS stored_files_owner_folder_idx ON stored_files(owner_id, folder_id);

CREATE TABLE IF NOT EXISTS content_groups (
    id UUID PRIMARY KEY,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('BOOKMARK', 'NOTE')),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE content_groups ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE content_groups DROP CONSTRAINT IF EXISTS content_groups_unique_name;
CREATE UNIQUE INDEX IF NOT EXISTS content_groups_owner_type_name_idx ON content_groups(owner_id, type, name);
CREATE INDEX IF NOT EXISTS content_groups_owner_type_idx ON content_groups(owner_id, type);

CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES content_groups(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS bookmarks_created_at_idx ON bookmarks(created_at DESC);
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES content_groups(id) ON DELETE RESTRICT;
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS bookmarks_group_id_idx ON bookmarks(group_id);
CREATE INDEX IF NOT EXISTS bookmarks_owner_group_idx ON bookmarks(owner_id, group_id);

CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES content_groups(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    color VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes(updated_at DESC);
ALTER TABLE notes ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES content_groups(id) ON DELETE RESTRICT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS notes_group_id_idx ON notes(group_id);
CREATE INDEX IF NOT EXISTS notes_owner_group_idx ON notes(owner_id, group_id);
