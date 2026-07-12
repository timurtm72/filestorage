package com.example.filestorage.note;

import com.example.filestorage.shared.BadRequestException;
import com.example.filestorage.shared.NotFoundException;
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

    public NoteService(NoteRepository noteRepository, R2dbcEntityTemplate entityTemplate) {
        this.noteRepository = noteRepository;
        this.entityTemplate = entityTemplate;
    }

    public Flux<Note> list() {
        return noteRepository.findAllByOrderByUpdatedAtDesc();
    }

    public Mono<Note> create(NoteRequest request) {
        String title = normalizeRequired(request.title(), "Заголовок обязателен");
        String content = normalizeRequired(request.content(), "Текст заметки обязателен");
        String color = normalizeColor(request.color());
        OffsetDateTime now = OffsetDateTime.now();
        return entityTemplate.insert(new Note(UUID.randomUUID(), title, content, color, now, now));
    }

    public Mono<Note> update(UUID id, NoteRequest request) {
        String title = normalizeRequired(request.title(), "Заголовок обязателен");
        String content = normalizeRequired(request.content(), "Текст заметки обязателен");
        String color = normalizeColor(request.color());
        return noteRepository.findById(id)
                .switchIfEmpty(Mono.error(new NotFoundException("Заметка не найдена")))
                .flatMap(note -> {
                    note.setTitle(title);
                    note.setContent(content);
                    note.setColor(color);
                    note.setUpdatedAt(OffsetDateTime.now());
                    return noteRepository.save(note);
                });
    }

    public Mono<Void> delete(UUID id) {
        return noteRepository.existsById(id)
                .filter(Boolean::booleanValue)
                .switchIfEmpty(Mono.error(new NotFoundException("Заметка не найдена")))
                .then(noteRepository.deleteById(id));
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
