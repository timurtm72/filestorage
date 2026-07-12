package com.example.filestorage.bookmark;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface BookmarkRepository extends ReactiveCrudRepository<Bookmark, UUID> {

    Flux<Bookmark> findAllByOrderByCreatedAtDesc();
}
