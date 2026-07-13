package com.example.filestorage.auth;

import com.example.filestorage.shared.BadRequestException;
import com.example.filestorage.shared.ConflictException;
import com.example.filestorage.shared.UnauthorizedException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Service
public class AuthService {
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final SecureRandom RANDOM = new SecureRandom();
    private final AppUserRepository users;
    private final AuthSessionRepository sessions;
    private final EmailVerificationTokenRepository verificationTokens;
    private final LoginVerificationTokenRepository loginTokens;
    private final R2dbcEntityTemplate template;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final AuthProperties properties;

    public AuthService(AppUserRepository users, AuthSessionRepository sessions,
            EmailVerificationTokenRepository verificationTokens, LoginVerificationTokenRepository loginTokens,
            R2dbcEntityTemplate template,
            PasswordEncoder passwordEncoder, MailService mailService, AuthProperties properties) {
        this.users = users; this.sessions = sessions; this.verificationTokens = verificationTokens;
        this.loginTokens = loginTokens;
        this.template = template; this.passwordEncoder = passwordEncoder;
        this.mailService = mailService; this.properties = properties;
    }

    public Mono<Boolean> register(String rawEmail, String password) {
        String email = normalizeEmail(rawEmail);
        validatePassword(password);
        return users.findByEmail(email)
                .flatMap(user -> Mono.<AppUser>error(new ConflictException("Email уже зарегистрирован")))
                .switchIfEmpty(encode(password).flatMap(hash -> template.insert(
                        new AppUser(UUID.randomUUID(), email, hash, !properties.mailEnabled(), OffsetDateTime.now()))))
                .flatMap(user -> properties.mailEnabled()
                        ? issueVerification(user)
                                .onErrorResume(exception -> users.delete(user).then(Mono.error(exception)))
                                .thenReturn(true)
                        : Mono.just(false))
                .onErrorMap(DataIntegrityViolationException.class,
                        exception -> new ConflictException("Email уже зарегистрирован"));
    }

    public Mono<Void> resendVerification(String rawEmail) {
        String email = normalizeEmail(rawEmail);
        return users.findByEmail(email)
                .filter(user -> !user.isEmailVerified())
                .flatMap(this::issueVerification)
                .then();
    }

    public Mono<Void> verifyEmail(String token) {
        if (token == null || token.isBlank()) return Mono.error(new BadRequestException("Токен обязателен"));
        return verificationTokens.findByTokenHash(hash(token))
                .filter(item -> item.getExpiresAt().isAfter(OffsetDateTime.now()))
                .switchIfEmpty(Mono.error(new BadRequestException("Ссылка недействительна или устарела")))
                .flatMap(item -> users.findById(item.getUserId())
                        .flatMap(user -> { user.setEmailVerified(true); return users.save(user); })
                        .then(verificationTokens.deleteByUserId(item.getUserId())));
    }

    public Mono<LoginAttempt> login(String rawEmail, String password) {
        String email = normalizeEmail(rawEmail);
        return users.findByEmail(email)
                .switchIfEmpty(Mono.error(new UnauthorizedException("Неверный email или пароль")))
                .flatMap(user -> matches(password, user.getPasswordHash())
                        .filter(Boolean::booleanValue)
                        .switchIfEmpty(Mono.error(new UnauthorizedException("Неверный email или пароль")))
                        .thenReturn(user))
                .flatMap(user -> {
                    if (!properties.mailEnabled()) return createSession(user).map(result -> new LoginAttempt(result, false));
                    if (!user.isEmailVerified()) return Mono.<LoginAttempt>error(
                            new UnauthorizedException("Сначала подтвердите email"));
                    return issueLoginVerification(user).thenReturn(new LoginAttempt(null, true));
                });
    }

    public Mono<LoginResult> confirmLogin(String token) {
        if (token == null || token.isBlank()) return Mono.error(new BadRequestException("Токен обязателен"));
        return loginTokens.findByTokenHash(hash(token))
                .filter(item -> item.getExpiresAt().isAfter(OffsetDateTime.now()))
                .switchIfEmpty(Mono.error(new BadRequestException("Ссылка недействительна или устарела")))
                .flatMap(item -> users.findById(item.getUserId())
                        .filter(AppUser::isEmailVerified)
                        .switchIfEmpty(Mono.error(new UnauthorizedException("Пользователь не найден")))
                        .flatMap(this::createSession)
                        .flatMap(result -> loginTokens.deleteByUserId(item.getUserId()).thenReturn(result)));
    }

    public Mono<AppPrincipal> authenticateSession(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return Mono.empty();
        return sessions.findByTokenHash(hash(rawToken))
                .filter(session -> session.getExpiresAt().isAfter(OffsetDateTime.now()))
                .flatMap(session -> users.findById(session.getUserId()))
                .filter(AppUser::isEmailVerified)
                .map(user -> new AppPrincipal(user.getId(), user.getEmail()));
    }

    public Mono<Void> logout(String rawToken) {
        return rawToken == null || rawToken.isBlank() ? Mono.empty() : sessions.deleteByTokenHash(hash(rawToken));
    }

    public Mono<Void> changePassword(UUID userId, String currentPassword, String newPassword) {
        validatePassword(newPassword);
        return users.findById(userId)
                .switchIfEmpty(Mono.error(new UnauthorizedException("Пользователь не найден")))
                .flatMap(user -> matches(currentPassword, user.getPasswordHash())
                        .filter(Boolean::booleanValue)
                        .switchIfEmpty(Mono.error(new BadRequestException("Текущий пароль неверен")))
                        .then(encode(newPassword))
                        .flatMap(hash -> { user.setPasswordHash(hash); return users.save(user); }))
                .then(Mono.when(sessions.deleteByUserId(userId), loginTokens.deleteByUserId(userId)));
    }

    private Mono<Void> issueVerification(AppUser user) {
        String token = randomToken();
        OffsetDateTime now = OffsetDateTime.now();
        return verificationTokens.deleteByUserId(user.getId())
                .then(template.insert(new EmailVerificationToken(UUID.randomUUID(), user.getId(), hash(token),
                        now.plusHours(properties.verificationHours()), now)))
                .then(mailService.sendVerification(user.getEmail(), token));
    }

    private Mono<LoginResult> createSession(AppUser user) {
        String token = randomToken();
        OffsetDateTime now = OffsetDateTime.now();
        return sessions.deleteByExpiresAtBefore(now)
                .then(template.insert(new AuthSession(UUID.randomUUID(), user.getId(), hash(token),
                        now.plusHours(properties.sessionHours()), now)))
                .thenReturn(new LoginResult(new AppPrincipal(user.getId(), user.getEmail()), token));
    }

    private Mono<Void> issueLoginVerification(AppUser user) {
        String token = randomToken();
        OffsetDateTime now = OffsetDateTime.now();
        return loginTokens.deleteByUserId(user.getId())
                .then(template.insert(new LoginVerificationToken(UUID.randomUUID(), user.getId(), hash(token),
                        now.plusMinutes(properties.loginVerificationMinutes()), now)))
                .then(mailService.sendLoginVerification(user.getEmail(), token));
    }

    private Mono<String> encode(String password) {
        return Mono.fromCallable(() -> passwordEncoder.encode(password)).subscribeOn(Schedulers.boundedElastic());
    }

    private Mono<Boolean> matches(String password, String hash) {
        return Mono.fromCallable(() -> passwordEncoder.matches(password == null ? "" : password, hash))
                .subscribeOn(Schedulers.boundedElastic());
    }

    private String normalizeEmail(String value) {
        String email = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (email.length() > 320 || !EMAIL.matcher(email).matches()) throw new BadRequestException("Некорректный email");
        return email;
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 10
                || password.getBytes(StandardCharsets.UTF_8).length > 72
                || password.codePoints().noneMatch(Character::isUpperCase)
                || password.codePoints().noneMatch(Character::isLowerCase)
                || password.codePoints().noneMatch(Character::isDigit)) {
            throw new BadRequestException("Пароль: 10–72 байта, заглавная и строчная буквы, цифра");
        }
    }

    private String randomToken() {
        byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    public record LoginResult(AppPrincipal principal, String token) {}
    public record LoginAttempt(LoginResult result, boolean confirmationRequired) {}
}
