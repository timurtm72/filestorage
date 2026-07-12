package com.example.filestorage.bookmark;

import com.example.filestorage.shared.BadRequestException;
import com.example.filestorage.shared.NotFoundException;
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final R2dbcEntityTemplate entityTemplate;

    public BookmarkService(BookmarkRepository bookmarkRepository, R2dbcEntityTemplate entityTemplate) {
        this.bookmarkRepository = bookmarkRepository;
        this.entityTemplate = entityTemplate;
    }

    public Flux<Bookmark> list() {
        return bookmarkRepository.findAllByOrderByCreatedAtDesc();
    }

    public Mono<Bookmark> create(BookmarkRequest request) {
        String title = normalizeRequired(request.title(), "Название обязательно");
        String url = normalizeUrl(request.url());
        String description = request.description() == null ? null : request.description().trim();
        return entityTemplate.insert(new Bookmark(
                UUID.randomUUID(),
                title,
                url,
                description,
                OffsetDateTime.now()
        ));
    }

    public Mono<Bookmark> update(UUID id, BookmarkRequest request) {
        String title = normalizeRequired(request.title(), "Название обязательно");
        String url = normalizeUrl(request.url());
        String description = request.description() == null ? null : request.description().trim();
        return bookmarkRepository.findById(id)
                .switchIfEmpty(Mono.error(new NotFoundException("Закладка не найдена")))
                .flatMap(bookmark -> {
                    bookmark.setTitle(title);
                    bookmark.setUrl(url);
                    bookmark.setDescription(description);
                    return bookmarkRepository.save(bookmark);
                });
    }

    public Mono<Void> delete(UUID id) {
        return bookmarkRepository.existsById(id)
                .filter(Boolean::booleanValue)
                .switchIfEmpty(Mono.error(new NotFoundException("Закладка не найдена")))
                .then(bookmarkRepository.deleteById(id));
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }

    private String normalizeUrl(String value) {
        String url = normalizeRequired(value, "Ссылка обязательна");
        try {
            URI uri = URI.create(url);
            if (uri.getScheme() == null || uri.getHost() == null) {
                throw new BadRequestException("Ссылка должна содержать протокол и адрес сайта");
            }
            return uri.toString();
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Некорректная ссылка");
        }
    }
}
