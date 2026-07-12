package com.example.filestorage.note;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface NoteRepository extends ReactiveCrudRepository<Note, UUID> {

    Flux<Note> findAllByOrderByUpdatedAtDesc();
}
