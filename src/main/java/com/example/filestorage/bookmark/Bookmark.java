package com.example.filestorage.bookmark;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("bookmarks")
public class Bookmark {

    @Id
    private UUID id;
    private UUID ownerId;
    private UUID groupId;
    private String title;
    private String url;
    private String description;
    private OffsetDateTime createdAt;

    public Bookmark() {
    }

    public Bookmark(UUID id, UUID ownerId, UUID groupId, String title, String url, String description, OffsetDateTime createdAt) {
        this.id = id;
        this.ownerId = ownerId;
        this.groupId = groupId;
        this.title = title;
        this.url = url;
        this.description = description;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }
    public UUID getOwnerId() { return ownerId; }
    public void setOwnerId(UUID ownerId) { this.ownerId = ownerId; }
    public UUID getGroupId() { return groupId; }
    public void setGroupId(UUID groupId) { this.groupId = groupId; }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
