CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY,
    parent_id UUID REFERENCES folders(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT folders_unique_name_per_parent UNIQUE (parent_id, name)
);

CREATE TABLE IF NOT EXISTS stored_files (
    id UUID PRIMARY KEY,
    folder_id UUID REFERENCES folders(id) ON DELETE RESTRICT,
    original_name VARCHAR(512) NOT NULL,
    storage_name VARCHAR(768) NOT NULL,
    size_bytes BIGINT NOT NULL,
    content_type VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS stored_files_folder_id_idx ON stored_files(folder_id);

CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS bookmarks_created_at_idx ON bookmarks(created_at DESC);

CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    color VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes(updated_at DESC);
