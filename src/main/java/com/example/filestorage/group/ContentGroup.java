package com.example.filestorage.group;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("content_groups")
public class ContentGroup {
    @Id private UUID id;
    private String type;
    private String name;
    private OffsetDateTime createdAt;

    public ContentGroup() {}
    public ContentGroup(UUID id, String type, String name, OffsetDateTime createdAt) {
        this.id = id; this.type = type; this.name = name; this.createdAt = createdAt;
    }
    public UUID getId() { return id; }
    public String getType() { return type; }
    public String getName() { return name; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setName(String name) { this.name = name; }
}
