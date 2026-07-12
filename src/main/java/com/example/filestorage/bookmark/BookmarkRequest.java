package com.example.filestorage.bookmark;

import java.util.UUID;

public record BookmarkRequest(String title, String url, String description, UUID groupId) {
}
