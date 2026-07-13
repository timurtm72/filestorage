package com.example.filestorage.note;

import com.example.filestorage.shared.BadRequestException;
import com.example.filestorage.shared.NotFoundException;
import com.example.filestorage.group.ContentGroupRepository;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class NoteService {

    private static final Set<String> ALLOWED_COLORS = Set.of("white", "yellow", "green", "blue", "rose");

    private final NoteRepository noteRepository;
    private final R2dbcEntityTemplate entityTemplate;
    private final ContentGroupRepository groupRepository;

    public NoteService(NoteRepository noteRepository, R2dbcEntityTemplate entityTemplate, ContentGroupRepository groupRepository) {
        this.noteRepository = noteRepository;
        this.entityTemplate = entityTemplate;
        this.groupRepository = groupRepository;
    }

    public Flux<Note> list(UUID ownerId, UUID groupId, boolean ungrouped) {
        if (ungrouped) return noteRepository.findByOwnerIdAndGroupIdIsNullOrderByUpdatedAtDesc(ownerId);
        return groupId == null ? noteRepository.findByOwnerIdOrderByUpdatedAtDesc(ownerId)
                : noteRepository.findByOwnerIdAndGroupIdOrderByUpdatedAtDesc(ownerId, groupId);
    }

    public Mono<Note> create(UUID ownerId, NoteRequest request) {
        String title = normalizeRequired(request.title(), "Заголовок обязателен");
        String content = normalizeRequired(request.content(), "Текст заметки обязателен");
        String color = normalizeColor(request.color());
        OffsetDateTime now = OffsetDateTime.now();
        return validateGroup(ownerId, request.groupId(), "NOTE").then(entityTemplate.insert(
                new Note(UUID.randomUUID(), ownerId, request.groupId(), title, content, color, now, now)));
    }

    public Mono<Note> update(UUID ownerId, UUID id, NoteRequest request) {
        String title = normalizeRequired(request.title(), "Заголовок обязателен");
        String content = normalizeRequired(request.content(), "Текст заметки обязателен");
        String color = normalizeColor(request.color());
        return noteRepository.findByIdAndOwnerId(id, ownerId)
                .switchIfEmpty(Mono.error(new NotFoundException("Заметка не найдена")))
                .flatMap(note -> {
                    note.setTitle(title);
                    note.setContent(content);
                    note.setColor(color);
                    note.setGroupId(request.groupId());
                    note.setUpdatedAt(OffsetDateTime.now());
                    return validateGroup(ownerId, request.groupId(), "NOTE").then(noteRepository.save(note));
                });
    }

    private Mono<Void> validateGroup(UUID ownerId, UUID groupId, String type) {
        if (groupId == null) return Mono.error(new BadRequestException("Группа обязательна"));
        return groupRepository.findByIdAndOwnerId(groupId, ownerId).filter(group -> type.equals(group.getType()))
                .switchIfEmpty(Mono.error(new BadRequestException("Группа не найдена"))).then();
    }

    public Mono<Void> delete(UUID ownerId, UUID id) {
        return noteRepository.findByIdAndOwnerId(id, ownerId)
                .switchIfEmpty(Mono.error(new NotFoundException("Заметка не найдена")))
                .flatMap(noteRepository::delete);
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }

    private String normalizeColor(String color) {
        String normalized = color == null ? "white" : color.trim().toLowerCase();
        if (!ALLOWED_COLORS.contains(normalized)) {
            throw new BadRequestException("Недопустимый цвет заметки");
        }
        return normalized;
    }
}
