package com.example.filestorage.group;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface ContentGroupRepository extends ReactiveCrudRepository<ContentGroup, UUID> {
    Flux<ContentGroup> findByTypeOrderByNameAsc(String type);
}
