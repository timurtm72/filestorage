package com.example.filestorage.group;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface ContentGroupRepository extends ReactiveCrudRepository<ContentGroup, UUID> {
    Flux<ContentGroup> findByOwnerIdAndTypeOrderByNameAsc(UUID ownerId, String type);
    Mono<ContentGroup> findByIdAndOwnerId(UUID id, UUID ownerId);
}
