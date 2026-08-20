package com.tap.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple in-memory, per-IP rate limiter. Protects the backend from being
 * overloaded or abused (e.g. someone hammering the API, or brute-forcing
 * login) rather than trying to raise how many *legitimate* users it can
 * serve - that's a separate concern (connection pool / hosting tier sizing).
 *
 * Two tiers, both fixed 60-second windows reset on a background sweep:
 *   - GENERAL: applies to all requests, keeps any single IP from hogging
 *     the DB connection pool / Tomcat threads that everyone else shares.
 *   - AUTH: much stricter, applies only to /api/auth/** (login, register,
 *     forgot/reset password) - these are the endpoints someone would
 *     script against to brute-force credentials, so they get a tighter cap
 *     regardless of how the general limit is tuned.
 *
 * This is intentionally simple (no Redis, no extra dependency) so it works
 * unmodified on a single Render/Railway-style instance. If the app is ever
 * scaled to multiple backend instances behind a load balancer, per-instance
 * in-memory counters stop being accurate across instances - at that point
 * swap this for a shared store (Redis + Bucket4j, or an API-gateway-level
 * limiter) instead of increasing these numbers further.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    // Requests allowed per IP per rolling minute for ordinary API traffic.
    @Value("${app.ratelimit.general-per-minute:120}")
    private int generalLimitPerMinute;

    // Requests allowed per IP per rolling minute for auth endpoints
    // (login/register/forgot-password/reset-password) specifically.
    @Value("${app.ratelimit.auth-per-minute:10}")
    private int authLimitPerMinute;

    private static final long WINDOW_MILLIS = 60_000L;

    private final ConcurrentHashMap<String, Counter> generalCounters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Counter> authCounters = new ConcurrentHashMap<>();

    private static final class Counter {
        final AtomicInteger count = new AtomicInteger(0);
        volatile long windowStart = System.currentTimeMillis();
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {

        String ip = clientIp(request);
        String path = request.getRequestURI();

        boolean isAuthEndpoint = path.startsWith("/api/auth/");
        ConcurrentHashMap<String, Counter> counters = isAuthEndpoint ? authCounters : generalCounters;
        int limit = isAuthEndpoint ? authLimitPerMinute : generalLimitPerMinute;

        Counter counter = counters.computeIfAbsent(ip, k -> new Counter());
        long now = System.currentTimeMillis();

        synchronized (counter) {
            if (now - counter.windowStart > WINDOW_MILLIS) {
                counter.windowStart = now;
                counter.count.set(0);
            }
        }

        int current = counter.count.incrementAndGet();

        if (current > limit) {
            response.setStatus(429); // 429 Too Many Requests
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"Too many requests. Please slow down and try again shortly.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Prefers X-Forwarded-For (set by Render/most hosts' reverse proxy) over
     * the raw remote address, which would otherwise just be the proxy's IP
     * for every request and make the limiter useless in production.
     */
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
