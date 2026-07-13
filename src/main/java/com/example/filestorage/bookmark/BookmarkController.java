package com.example.filestorage.bookmark;

import com.example.filestorage.auth.AppPrincipal;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/bookmarks")
public class BookmarkController {

    private final BookmarkService bookmarkService;

    public BookmarkController(BookmarkService bookmarkService) {
        this.bookmarkService = bookmarkService;
    }

    @GetMapping
    public Flux<Bookmark> list(@AuthenticationPrincipal AppPrincipal principal,
            @RequestParam(required = false) UUID groupId,
            @RequestParam(defaultValue = "false") boolean ungrouped) {
        return bookmarkService.list(principal.id(), groupId, ungrouped);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<Bookmark> create(@AuthenticationPrincipal AppPrincipal principal,
            @RequestBody BookmarkRequest request) {
        return bookmarkService.create(principal.id(), request);
    }

    @PatchMapping("/{id}")
    public Mono<Bookmark> update(@AuthenticationPrincipal AppPrincipal principal,
            @PathVariable UUID id, @RequestBody BookmarkRequest request) {
        return bookmarkService.update(principal.id(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@AuthenticationPrincipal AppPrincipal principal, @PathVariable UUID id) {
        return bookmarkService.delete(principal.id(), id);
    }
}
