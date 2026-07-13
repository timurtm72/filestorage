package com.example.filestorage.auth;

import com.example.filestorage.shared.BadRequestException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Service
public class MailService {
    private final ObjectProvider<JavaMailSender> mailSender;
    private final AuthProperties properties;

    public MailService(ObjectProvider<JavaMailSender> mailSender, AuthProperties properties) {
        this.mailSender = mailSender; this.properties = properties;
    }

    public Mono<Void> sendVerification(String email, String token) {
        return send(email, "Подтверждение email — FileStorage", "Подтвердите email:\n"
                + url("/verify-email?token=", token) + "\n\nСсылка действует " + properties.verificationHours() + " ч.");
    }

    public Mono<Void> sendLoginVerification(String email, String token) {
        return send(email, "Подтверждение входа — FileStorage", "Подтвердите вход:\n"
                + url("/verify-login?token=", token) + "\n\nСсылка действует "
                + properties.loginVerificationMinutes() + " мин. Если это не вы, проигнорируйте письмо.");
    }

    private Mono<Void> send(String email, String subject, String text) {
        return Mono.fromRunnable(() -> {
            JavaMailSender sender = mailSender.getIfAvailable();
            if (sender == null || properties.mailFrom() == null || properties.mailFrom().isBlank()) {
                throw new BadRequestException("SMTP не настроен");
            }
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(properties.mailFrom());
            message.setTo(email);
            message.setSubject(subject);
            message.setText(text);
            sender.send(message);
        }).subscribeOn(Schedulers.boundedElastic()).then();
    }

    private String url(String path, String token) {
        return properties.publicUrl().replaceAll("/+$", "") + path + token;
    }
}
