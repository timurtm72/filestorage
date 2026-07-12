package com.example.filestorage.shared;

import java.time.OffsetDateTime;

public record ApiError(String message, int status, OffsetDateTime timestamp) {
}
