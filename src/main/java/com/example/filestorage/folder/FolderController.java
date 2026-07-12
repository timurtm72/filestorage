package com.example.filestorage.folder;

import java.util.UUID;
import org.springframework.http.HttpStatus;
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
    public Flux<Folder> list(@RequestParam(required = false) UUID parentId) {
        return folderService.list(parentId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<Folder> create(@RequestBody CreateFolderRequest request) {
        return folderService.create(request);
    }

    @PatchMapping("/{id}")
    public Mono<Folder> update(@PathVariable UUID id, @RequestBody UpdateFolderRequest request) {
        return folderService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable UUID id) {
        return folderService.delete(id);
    }
}
