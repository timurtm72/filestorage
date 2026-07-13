package com.example.filestorage.auth;

import java.time.Duration;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.server.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    public static final String SESSION_COOKIE = "FS_SESSION";
    private final AuthService service;
    private final AuthProperties properties;

    public AuthController(AuthService service, AuthProperties properties) {
        this.service = service; this.properties = properties;
    }

    @GetMapping("/csrf")
    public Mono<Map<String, String>> csrf(ServerWebExchange exchange) {
        Mono<CsrfToken> token = exchange.getAttribute(CsrfToken.class.getName());
        return token.map(value -> Map.of("token", value.getToken(), "headerName", value.getHeaderName()));
    }

    @PostMapping("/register")
    public Mono<RegistrationResponse> register(@RequestBody Credentials request) {
        return service.register(request.email(), request.password())
                .map(required -> new RegistrationResponse(required
                        ? "Письмо подтверждения отправлено" : "Регистрация завершена", required));
    }

    @PostMapping("/resend-verification")
    public Mono<MessageResponse> resend(@RequestBody EmailRequest request) {
        return service.resendVerification(request.email())
                .thenReturn(new MessageResponse("Если email зарегистрирован, письмо отправлено"));
    }

    @PostMapping("/verify-email")
    public Mono<MessageResponse> verify(@RequestBody TokenRequest request) {
        return service.verifyEmail(request.token()).thenReturn(new MessageResponse("Email подтверждён"));
    }

    @PostMapping("/login")
    public Mono<LoginResponse> login(@RequestBody Credentials request, ServerWebExchange exchange) {
        return service.login(request.email(), request.password()).map(attempt -> {
            if (attempt.confirmationRequired()) {
                return new LoginResponse("Ссылка подтверждения входа отправлена", null, true);
            }
            var result = attempt.result();
            exchange.getResponse().addCookie(sessionCookie(result.token(), Duration.ofHours(properties.sessionHours())));
            return new LoginResponse("Вход выполнен", UserResponse.from(result.principal()), false);
        });
    }

    @PostMapping("/confirm-login")
    public Mono<UserResponse> confirmLogin(@RequestBody TokenRequest request, ServerWebExchange exchange) {
        return service.confirmLogin(request.token()).map(result -> {
            exchange.getResponse().addCookie(sessionCookie(result.token(), Duration.ofHours(properties.sessionHours())));
            return UserResponse.from(result.principal());
        });
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> logout(ServerWebExchange exchange) {
        String token = cookie(exchange);
        exchange.getResponse().addCookie(sessionCookie("", Duration.ZERO));
        return service.logout(token);
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AppPrincipal principal) {
        return UserResponse.from(principal);
    }

    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> changePassword(@AuthenticationPrincipal AppPrincipal principal,
            @RequestBody ChangePasswordRequest request, ServerWebExchange exchange) {
        return service.changePassword(principal.id(), request.currentPassword(), request.newPassword())
                .doOnSuccess(ignored -> exchange.getResponse().addCookie(sessionCookie("", Duration.ZERO)));
    }

    private String cookie(ServerWebExchange exchange) {
        var cookie = exchange.getRequest().getCookies().getFirst(SESSION_COOKIE);
        return cookie == null ? null : cookie.getValue();
    }

    private ResponseCookie sessionCookie(String value, Duration maxAge) {
        return ResponseCookie.from(SESSION_COOKIE, value).httpOnly(true).secure(properties.secureCookie())
                .sameSite("Strict").path("/").maxAge(maxAge).build();
    }

    public record Credentials(String email, String password) {}
    public record EmailRequest(String email) {}
    public record TokenRequest(String token) {}
    public record ChangePasswordRequest(String currentPassword, String newPassword) {}
    public record MessageResponse(String message) {}
    public record RegistrationResponse(String message, boolean confirmationRequired) {}
    public record LoginResponse(String message, UserResponse user, boolean confirmationRequired) {}
    public record UserResponse(String id, String email) {
        static UserResponse from(AppPrincipal principal) { return new UserResponse(principal.id().toString(), principal.email()); }
    }
}
