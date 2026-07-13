package com.example.filestorage.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.auth")
public record AuthProperties(
        String publicUrl,
        String mailFrom,
        long sessionHours,
        long verificationHours,
        long loginVerificationMinutes,
        boolean mailEnabled,
        boolean secureCookie
) {}
