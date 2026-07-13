package com.example.filestorage.auth;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("users")
public class AppUser {
    @Id private UUID id;
    private String email;
    private String passwordHash;
    private boolean emailVerified;
    private OffsetDateTime createdAt;

    public AppUser() {}
    public AppUser(UUID id, String email, String passwordHash, boolean emailVerified, OffsetDateTime createdAt) {
        this.id = id; this.email = email; this.passwordHash = passwordHash;
        this.emailVerified = emailVerified; this.createdAt = createdAt;
    }
    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public boolean isEmailVerified() { return emailVerified; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }
}
