package com.example.filestorage.auth;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("login_verification_tokens")
public class LoginVerificationToken {
    @Id private UUID id;
    private UUID userId;
    private String tokenHash;
    private OffsetDateTime expiresAt;
    private OffsetDateTime createdAt;

    public LoginVerificationToken() {}
    public LoginVerificationToken(UUID id, UUID userId, String tokenHash, OffsetDateTime expiresAt, OffsetDateTime createdAt) {
        this.id = id; this.userId = userId; this.tokenHash = tokenHash;
        this.expiresAt = expiresAt; this.createdAt = createdAt;
    }
    public UUID getUserId() { return userId; }
    public OffsetDateTime getExpiresAt() { return expiresAt; }
}
