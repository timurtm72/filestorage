package com.example.filestorage.auth;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Mono;

public interface AppUserRepository extends ReactiveCrudRepository<AppUser, UUID> {
    Mono<AppUser> findByEmail(String email);
}
