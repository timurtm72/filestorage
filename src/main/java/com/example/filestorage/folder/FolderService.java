package com.example.filestorage.folder;

import com.example.filestorage.shared.BadRequestException;
import com.example.filestorage.shared.ConflictException;
import com.example.filestorage.shared.NotFoundException;
import com.example.filestorage.storage.StoredFileRepository;
import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class FolderService {

    private final FolderRepository folderRepository;
    private final StoredFileRepository storedFileRepository;
    private final R2dbcEntityTemplate entityTemplate;

    public FolderService(
            FolderRepository folderRepository,
            StoredFileRepository storedFileRepository,
            R2dbcEntityTemplate entityTemplate
    ) {
        this.folderRepository = folderRepository;
        this.storedFileRepository = storedFileRepository;
        this.entityTemplate = entityTemplate;
    }

    public Flux<Folder> list(UUID parentId) {
        if (parentId == null) {
            return folderRepository.findByParentIdIsNullOrderByNameAsc();
        }
        return folderRepository.findByParentIdOrderByNameAsc(parentId);
    }

    public Mono<Folder> create(CreateFolderRequest request) {
        String name = normalizeName(request.name());
        Mono<Void> parentCheck = request.parentId() == null
                ? Mono.empty()
                : folderRepository.existsById(request.parentId())
                        .filter(Boolean::booleanValue)
                        .switchIfEmpty(Mono.error(new BadRequestException("Родительская папка не найдена")))
                        .then();

        return parentCheck.then(entityTemplate.insert(new Folder(
                UUID.randomUUID(),
                request.parentId(),
                name,
                OffsetDateTime.now()
        )));
    }

    public Mono<Folder> update(UUID id, UpdateFolderRequest request) {
        String name = normalizeName(request.name());
        return folderRepository.findById(id)
                .switchIfEmpty(Mono.error(new NotFoundException("Папка не найдена")))
                .flatMap(folder -> {
                    folder.setName(name);
                    return folderRepository.save(folder);
                });
    }

    public Mono<Void> delete(UUID id) {
        return folderRepository.findById(id)
                .switchIfEmpty(Mono.error(new NotFoundException("Папка не найдена")))
                .flatMap(folder -> Mono.zip(
                        folderRepository.countByParentId(id),
                        storedFileRepository.countByFolderId(id)
                ))
                .flatMap(counts -> {
                    if (counts.getT1() > 0 || counts.getT2() > 0) {
                        return Mono.error(new ConflictException("Папка не пустая"));
                    }
                    return folderRepository.deleteById(id);
                });
    }

    private String normalizeName(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("Название папки обязательно");
        }
        String name = Normalizer.normalize(value.trim(), Normalizer.Form.NFC);
        if (name.length() > 255 || name.indexOf('/') >= 0 || name.indexOf('\\') >= 0
                || name.codePoints().anyMatch(Character::isISOControl)) {
            throw new BadRequestException("Некорректное название папки");
        }
        return name;
    }
}
