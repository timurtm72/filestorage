package com.example.filestorage.group;

import com.example.filestorage.auth.AppPrincipal;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/groups")
public class ContentGroupController {
    private final ContentGroupService service;
    public ContentGroupController(ContentGroupService service) { this.service = service; }
    @GetMapping public Flux<ContentGroup> list(@AuthenticationPrincipal AppPrincipal principal,
            @RequestParam String type) { return service.list(principal.id(), type); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Mono<ContentGroup> create(@AuthenticationPrincipal AppPrincipal principal,
            @RequestBody ContentGroupRequest request) { return service.create(principal.id(), request); }
    @PatchMapping("/{id}")
    public Mono<ContentGroup> update(@AuthenticationPrincipal AppPrincipal principal,
            @PathVariable UUID id, @RequestBody ContentGroupRequest request) {
        return service.update(principal.id(), id, request);
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@AuthenticationPrincipal AppPrincipal principal, @PathVariable UUID id) {
        return service.delete(principal.id(), id);
    }
}
