package com.example.filestorage.storage;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileStorageService fileStorageService;

    public FileController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @GetMapping
    public Flux<StoredFile> list(@RequestParam(required = false) UUID folderId) {
        return fileStorageService.list(folderId);
    }

    @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<StoredFile> upload(
            @RequestParam(required = false) UUID folderId,
            @RequestPart("file") FilePart file
    ) {
        return fileStorageService.store(folderId, file);
    }

    @GetMapping("/{id}/download")
    public Mono<ResponseEntity<?>> download(@PathVariable UUID id) {
        return fileStorageService.download(id)
                .map(download -> ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                                .filename(download.metadata().getOriginalName(), StandardCharsets.UTF_8)
                                .build()
                                .toString())
                        .contentType(MediaType.parseMediaType(download.metadata().getContentType()))
                        .body(download.resource()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable UUID id) {
        return fileStorageService.delete(id);
    }
}
