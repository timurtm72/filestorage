package com.example.filestorage.bookmark;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface BookmarkRepository extends ReactiveCrudRepository<Bookmark, UUID> {

    Flux<Bookmark> findAllByOrderByCreatedAtDesc();
    Flux<Bookmark> findByGroupIdOrderByCreatedAtDesc(UUID groupId);
    Flux<Bookmark> findByGroupIdIsNullOrderByCreatedAtDesc();
    Mono<Long> countByGroupId(UUID groupId);
}
