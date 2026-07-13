package com.example.filestorage.storage;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface StoredFileRepository extends ReactiveCrudRepository<StoredFile, UUID> {

    Flux<StoredFile> findByOwnerIdAndFolderIdOrderByOriginalNameAsc(UUID ownerId, UUID folderId);
    Flux<StoredFile> findByOwnerIdAndFolderIdIsNullOrderByOriginalNameAsc(UUID ownerId);
    Mono<StoredFile> findByIdAndOwnerId(UUID id, UUID ownerId);
    Mono<Long> countByOwnerIdAndFolderId(UUID ownerId, UUID folderId);
}
