package com.example.filestorage.note;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface NoteRepository extends ReactiveCrudRepository<Note, UUID> {

    Flux<Note> findAllByOrderByUpdatedAtDesc();
    Flux<Note> findByGroupIdOrderByUpdatedAtDesc(UUID groupId);
    Flux<Note> findByGroupIdIsNullOrderByUpdatedAtDesc();
    Mono<Long> countByGroupId(UUID groupId);
}
