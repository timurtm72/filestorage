package com.example.filestorage.bookmark;

import com.example.filestorage.shared.BadRequestException;
import com.example.filestorage.shared.NotFoundException;
import com.example.filestorage.group.ContentGroupRepository;
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
    private final ContentGroupRepository groupRepository;

    public BookmarkService(BookmarkRepository bookmarkRepository, R2dbcEntityTemplate entityTemplate, ContentGroupRepository groupRepository) {
        this.bookmarkRepository = bookmarkRepository;
        this.entityTemplate = entityTemplate;
        this.groupRepository = groupRepository;
    }

    public Flux<Bookmark> list(UUID ownerId, UUID groupId, boolean ungrouped) {
        if (ungrouped) return bookmarkRepository.findByOwnerIdAndGroupIdIsNullOrderByCreatedAtDesc(ownerId);
        return groupId == null ? bookmarkRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId)
                : bookmarkRepository.findByOwnerIdAndGroupIdOrderByCreatedAtDesc(ownerId, groupId);
    }

    public Mono<Bookmark> create(UUID ownerId, BookmarkRequest request) {
        String title = normalizeRequired(request.title(), "Название обязательно");
        String url = normalizeUrl(request.url());
        String description = request.description() == null ? null : request.description().trim();
        return validateGroup(ownerId, request.groupId(), "BOOKMARK").then(entityTemplate.insert(new Bookmark(
                UUID.randomUUID(),
                ownerId,
                request.groupId(),
                title,
                url,
                description,
                OffsetDateTime.now()
        )));
    }

    public Mono<Bookmark> update(UUID ownerId, UUID id, BookmarkRequest request) {
        String title = normalizeRequired(request.title(), "Название обязательно");
        String url = normalizeUrl(request.url());
        String description = request.description() == null ? null : request.description().trim();
        return bookmarkRepository.findByIdAndOwnerId(id, ownerId)
                .switchIfEmpty(Mono.error(new NotFoundException("Закладка не найдена")))
                .flatMap(bookmark -> {
                    bookmark.setTitle(title);
                    bookmark.setUrl(url);
                    bookmark.setDescription(description);
                    bookmark.setGroupId(request.groupId());
                    return validateGroup(ownerId, request.groupId(), "BOOKMARK").then(bookmarkRepository.save(bookmark));
                });
    }

    private Mono<Void> validateGroup(UUID ownerId, UUID groupId, String type) {
        if (groupId == null) return Mono.error(new BadRequestException("Группа обязательна"));
        return groupRepository.findByIdAndOwnerId(groupId, ownerId).filter(group -> type.equals(group.getType()))
                .switchIfEmpty(Mono.error(new BadRequestException("Группа не найдена"))).then();
    }

    public Mono<Void> delete(UUID ownerId, UUID id) {
        return bookmarkRepository.findByIdAndOwnerId(id, ownerId)
                .switchIfEmpty(Mono.error(new NotFoundException("Закладка не найдена")))
                .flatMap(bookmarkRepository::delete);
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
