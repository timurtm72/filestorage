package com.example.filestorage.storage;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface StoredFileRepository extends ReactiveCrudRepository<StoredFile, UUID> {

    Flux<StoredFile> findByFolderIdOrderByOriginalNameAsc(UUID folderId);

    Flux<StoredFile> findByFolderIdIsNullOrderByOriginalNameAsc();

    Mono<Long> countByFolderId(UUID folderId);
}
