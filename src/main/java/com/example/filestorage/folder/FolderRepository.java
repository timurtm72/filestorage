package com.example.filestorage.folder;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface FolderRepository extends ReactiveCrudRepository<Folder, UUID> {

    Flux<Folder> findByParentIdOrderByNameAsc(UUID parentId);

    Flux<Folder> findByParentIdIsNullOrderByNameAsc();

    Mono<Long> countByParentId(UUID parentId);
}
