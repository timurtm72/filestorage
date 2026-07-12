package com.example.filestorage.note;

import java.util.UUID;

public record NoteRequest(String title, String content, String color, UUID groupId) {
}
