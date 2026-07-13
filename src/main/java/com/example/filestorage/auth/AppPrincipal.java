package com.example.filestorage.auth;

import java.util.UUID;

public record AppPrincipal(UUID id, String email) {}
