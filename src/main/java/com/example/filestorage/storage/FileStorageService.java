package com.example.filestorage.storage;

import com.example.filestorage.folder.FolderRepository;
import com.example.filestorage.shared.BadRequestException;
import com.example.filestorage.shared.NotFoundException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Service
public class FileStorageService {

    private final StoredFileRepository storedFileRepository;
    private final FolderRepository folderRepository;
    private final R2dbcEntityTemplate entityTemplate;
    private final Path fileRoot;

    public FileStorageService(
            StoredFileRepository storedFileRepository,
            FolderRepository folderRepository,
            R2dbcEntityTemplate entityTemplate,
            StorageProperties storageProperties
    ) {
        this.storedFileRepository = storedFileRepository;
        this.folderRepository = folderRepository;
        this.entityTemplate = entityTemplate;
        this.fileRoot = storageProperties.fileRoot().toAbsolutePath().normalize();
    }

    public Flux<StoredFile> list(UUID folderId) {
        if (folderId == null) {
            return storedFileRepository.findByFolderIdIsNullOrderByOriginalNameAsc();
        }
        return storedFileRepository.findByFolderIdOrderByOriginalNameAsc(folderId);
    }

    public Mono<StoredFile> store(UUID folderId, FilePart filePart) {
        if (filePart == null || filePart.filename() == null || filePart.filename().isBlank()) {
            return Mono.error(new BadRequestException("Файл обязателен"));
        }

        Mono<Void> folderCheck = folderId == null
                ? Mono.empty()
                : folderRepository.existsById(folderId)
                        .filter(Boolean::booleanValue)
                        .switchIfEmpty(Mono.error(new BadRequestException("Папка не найдена")))
                        .then();

        UUID id = UUID.randomUUID();
        String originalName = sanitize(filePart.filename());
        String storageName = id + "-" + originalName;
        Path target = fileRoot.resolve(storageName).normalize();
        String contentType = filePart.headers().getContentType() == null
                ? MediaType.APPLICATION_OCTET_STREAM_VALUE
                : filePart.headers().getContentType().toString();

        return folderCheck
                .then(Mono.fromRunnable(() -> createDirectory(fileRoot)).subscribeOn(Schedulers.boundedElastic()))
                .then(filePart.transferTo(target))
                .then(Mono.fromCallable(() -> Files.size(target)).subscribeOn(Schedulers.boundedElastic()))
                .flatMap(size -> entityTemplate.insert(new StoredFile(
                        id,
                        folderId,
                        originalName,
                        storageName,
                        size,
                        contentType,
                        OffsetDateTime.now()
                )))
                .onErrorResume(exception -> Mono.fromRunnable(() -> deletePathQuietly(target))
                        .subscribeOn(Schedulers.boundedElastic())
                        .then(Mono.error(exception)));
    }

    public Mono<DownloadFile> download(UUID id) {
        return storedFileRepository.findById(id)
                .switchIfEmpty(Mono.error(new NotFoundException("Файл не найден")))
                .map(file -> {
                    Path path = fileRoot.resolve(file.getStorageName()).normalize();
                    Resource resource = new FileSystemResource(path);
                    if (!resource.exists()) {
                        throw new NotFoundException("Физический файл не найден");
                    }
                    return new DownloadFile(file, resource);
                });
    }

    public Mono<Void> delete(UUID id) {
        return storedFileRepository.findById(id)
                .switchIfEmpty(Mono.error(new NotFoundException("Файл не найден")))
                .flatMap(file -> Mono.<Void>fromRunnable(() -> deletePhysicalFile(file))
                        .subscribeOn(Schedulers.boundedElastic())
                        .then(storedFileRepository.delete(file)));
    }

    private void createDirectory(Path path) {
        try {
            Files.createDirectories(path);
        } catch (Exception exception) {
            throw new BadRequestException("Не удалось создать папку хранилища");
        }
    }

    private void deletePhysicalFile(StoredFile file) {
        try {
            Files.deleteIfExists(fileRoot.resolve(file.getStorageName()).normalize());
        } catch (Exception exception) {
            throw new BadRequestException("Не удалось удалить физический файл");
        }
    }

    private void deletePathQuietly(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (Exception ignored) {
            // Preserve the original storage error for the API caller.
        }
    }

    private String sanitize(String filename) {
        String safeName = Path.of(filename).getFileName().toString().trim();
        return safeName.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
