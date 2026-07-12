package com.example.filestorage.group;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/groups")
public class ContentGroupController {
    private final ContentGroupService service;
    public ContentGroupController(ContentGroupService service) { this.service = service; }
    @GetMapping public Flux<ContentGroup> list(@RequestParam String type) { return service.list(type); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Mono<ContentGroup> create(@RequestBody ContentGroupRequest request) { return service.create(request); }
    @PatchMapping("/{id}")
    public Mono<ContentGroup> update(@PathVariable UUID id, @RequestBody ContentGroupRequest request) { return service.update(id, request); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable UUID id) { return service.delete(id); }
}
