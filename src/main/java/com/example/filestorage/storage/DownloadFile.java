package com.example.filestorage.storage;

import org.springframework.core.io.Resource;

public record DownloadFile(StoredFile metadata, Resource resource) {
}
