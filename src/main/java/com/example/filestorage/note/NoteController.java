package com.example.filestorage.note;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/notes")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping
    public Flux<Note> list(@RequestParam(required = false) UUID groupId,
            @RequestParam(defaultValue = "false") boolean ungrouped) {
        return noteService.list(groupId, ungrouped);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<Note> create(@RequestBody NoteRequest request) {
        return noteService.create(request);
    }

    @PatchMapping("/{id}")
    public Mono<Note> update(@PathVariable UUID id, @RequestBody NoteRequest request) {
        return noteService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable UUID id) {
        return noteService.delete(id);
    }
}
