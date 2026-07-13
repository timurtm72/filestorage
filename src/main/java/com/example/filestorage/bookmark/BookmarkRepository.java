package com.example.filestorage.bookmark;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface BookmarkRepository extends ReactiveCrudRepository<Bookmark, UUID> {

    Flux<Bookmark> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);
    Flux<Bookmark> findByOwnerIdAndGroupIdOrderByCreatedAtDesc(UUID ownerId, UUID groupId);
    Flux<Bookmark> findByOwnerIdAndGroupIdIsNullOrderByCreatedAtDesc(UUID ownerId);
    Mono<Bookmark> findByIdAndOwnerId(UUID id, UUID ownerId);
    Mono<Long> countByOwnerIdAndGroupId(UUID ownerId, UUID groupId);
}
