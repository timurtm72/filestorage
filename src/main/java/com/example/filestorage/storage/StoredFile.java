package com.example.filestorage.storage;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("stored_files")
public class StoredFile {

    @Id
    private UUID id;
    private UUID folderId;
    private String originalName;
    private String storageName;
    private long sizeBytes;
    private String contentType;
    private OffsetDateTime createdAt;

    public StoredFile() {
    }

    public StoredFile(
            UUID id,
            UUID folderId,
            String originalName,
            String storageName,
            long sizeBytes,
            String contentType,
            OffsetDateTime createdAt
    ) {
        this.id = id;
        this.folderId = folderId;
        this.originalName = originalName;
        this.storageName = storageName;
        this.sizeBytes = sizeBytes;
        this.contentType = contentType;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getFolderId() {
        return folderId;
    }

    public void setFolderId(UUID folderId) {
        this.folderId = folderId;
    }

    public String getOriginalName() {
        return originalName;
    }

    public void setOriginalName(String originalName) {
        this.originalName = originalName;
    }

    public String getStorageName() {
        return storageName;
    }

    public void setStorageName(String storageName) {
        this.storageName = storageName;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
