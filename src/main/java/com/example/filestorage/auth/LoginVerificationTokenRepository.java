package com.example.filestorage.auth;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Mono;

public interface LoginVerificationTokenRepository extends ReactiveCrudRepository<LoginVerificationToken, UUID> {
    Mono<LoginVerificationToken> findByTokenHash(String tokenHash);
    Mono<Void> deleteByUserId(UUID userId);
}
