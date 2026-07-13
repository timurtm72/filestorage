package com.example.filestorage.folder;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface FolderRepository extends ReactiveCrudRepository<Folder, UUID> {

    Flux<Folder> findByOwnerIdAndParentIdOrderByNameAsc(UUID ownerId, UUID parentId);
    Flux<Folder> findByOwnerIdAndParentIdIsNullOrderByNameAsc(UUID ownerId);
    Mono<Folder> findByIdAndOwnerId(UUID id, UUID ownerId);
    Mono<Boolean> existsByIdAndOwnerId(UUID id, UUID ownerId);
    Mono<Long> countByOwnerIdAndParentId(UUID ownerId, UUID parentId);
}
