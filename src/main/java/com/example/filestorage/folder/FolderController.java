package com.example.filestorage.folder;

import java.util.UUID;
import com.example.filestorage.auth.AppPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderService folderService;

    public FolderController(FolderService folderService) {
        this.folderService = folderService;
    }

    @GetMapping
    public Flux<Folder> list(@AuthenticationPrincipal AppPrincipal principal,
            @RequestParam(required = false) UUID parentId) {
        return folderService.list(principal.id(), parentId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<Folder> create(@AuthenticationPrincipal AppPrincipal principal,
            @RequestBody CreateFolderRequest request) {
        return folderService.create(principal.id(), request);
    }

    @PatchMapping("/{id}")
    public Mono<Folder> update(@AuthenticationPrincipal AppPrincipal principal,
            @PathVariable UUID id, @RequestBody UpdateFolderRequest request) {
        return folderService.update(principal.id(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@AuthenticationPrincipal AppPrincipal principal, @PathVariable UUID id) {
        return folderService.delete(principal.id(), id);
    }
}
