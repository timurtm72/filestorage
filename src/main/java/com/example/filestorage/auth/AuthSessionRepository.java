package com.example.filestorage.auth;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Mono;

public interface AuthSessionRepository extends ReactiveCrudRepository<AuthSession, UUID> {
    Mono<AuthSession> findByTokenHash(String tokenHash);
    Mono<Void> deleteByTokenHash(String tokenHash);
    Mono<Void> deleteByUserId(UUID userId);
    Mono<Void> deleteByExpiresAtBefore(OffsetDateTime expiresAt);
}
