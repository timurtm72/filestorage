package com.example.filestorage.group;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("content_groups")
public class ContentGroup {
    @Id private UUID id;
    private UUID ownerId;
    private String type;
    private String name;
    private OffsetDateTime createdAt;

    public ContentGroup() {}
    public ContentGroup(UUID id, UUID ownerId, String type, String name, OffsetDateTime createdAt) {
        this.id = id; this.ownerId = ownerId; this.type = type; this.name = name; this.createdAt = createdAt;
    }
    public UUID getId() { return id; }
    public UUID getOwnerId() { return ownerId; }
    public String getType() { return type; }
    public String getName() { return name; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setName(String name) { this.name = name; }
}
