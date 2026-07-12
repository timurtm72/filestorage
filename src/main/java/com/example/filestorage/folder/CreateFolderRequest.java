package com.example.filestorage.folder;

import java.util.UUID;

public record CreateFolderRequest(UUID parentId, String name) {
}
