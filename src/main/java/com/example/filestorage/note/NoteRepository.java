package com.example.filestorage.note;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface NoteRepository extends ReactiveCrudRepository<Note, UUID> {

    Flux<Note> findByOwnerIdOrderByUpdatedAtDesc(UUID ownerId);
    Flux<Note> findByOwnerIdAndGroupIdOrderByUpdatedAtDesc(UUID ownerId, UUID groupId);
    Flux<Note> findByOwnerIdAndGroupIdIsNullOrderByUpdatedAtDesc(UUID ownerId);
    Mono<Note> findByIdAndOwnerId(UUID id, UUID ownerId);
    Mono<Long> countByOwnerIdAndGroupId(UUID ownerId, UUID groupId);
}
