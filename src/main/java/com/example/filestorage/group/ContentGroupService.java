package com.example.filestorage.group;

import com.example.filestorage.bookmark.BookmarkRepository;
import com.example.filestorage.note.NoteRepository;
import com.example.filestorage.shared.BadRequestException;
import com.example.filestorage.shared.ConflictException;
import com.example.filestorage.shared.NotFoundException;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class ContentGroupService {
    private static final Set<String> TYPES = Set.of("BOOKMARK", "NOTE");
    private final ContentGroupRepository repository;
    private final BookmarkRepository bookmarks;
    private final NoteRepository notes;
    private final R2dbcEntityTemplate template;

    public ContentGroupService(ContentGroupRepository repository, BookmarkRepository bookmarks,
            NoteRepository notes, R2dbcEntityTemplate template) {
        this.repository = repository; this.bookmarks = bookmarks; this.notes = notes; this.template = template;
    }

    public Flux<ContentGroup> list(String type) { return repository.findByTypeOrderByNameAsc(normalizeType(type)); }
    public Mono<ContentGroup> create(ContentGroupRequest request) {
        return template.insert(new ContentGroup(UUID.randomUUID(), normalizeType(request.type()),
                normalizeName(request.name()), OffsetDateTime.now()));
    }
    public Mono<ContentGroup> update(UUID id, ContentGroupRequest request) {
        return repository.findById(id).switchIfEmpty(Mono.error(new NotFoundException("Группа не найдена")))
                .flatMap(group -> { group.setName(normalizeName(request.name())); return repository.save(group); });
    }
    public Mono<Void> delete(UUID id) {
        return repository.findById(id).switchIfEmpty(Mono.error(new NotFoundException("Группа не найдена")))
                .flatMap(group -> Mono.zip(bookmarks.countByGroupId(id), notes.countByGroupId(id)))
                .flatMap(counts -> counts.getT1() + counts.getT2() > 0
                        ? Mono.error(new ConflictException("Группа не пустая")) : repository.deleteById(id));
    }
    private String normalizeType(String value) {
        String type = value == null ? "" : value.trim().toUpperCase();
        if (!TYPES.contains(type)) throw new BadRequestException("Недопустимый тип группы");
        return type;
    }
    private String normalizeName(String value) {
        if (value == null || value.isBlank()) throw new BadRequestException("Название группы обязательно");
        return value.trim();
    }
}
