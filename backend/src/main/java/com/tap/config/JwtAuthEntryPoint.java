package com.tap.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Without this, Spring Security's default entry point returns a bare 403
 * with no body whenever a request has no token, an invalid token, or an
 * EXPIRED token - the frontend has no reliable way to tell "your session
 * expired, please log in again" apart from any other failure.
 *
 * This always returns 401 with a clear JSON message, which the frontend's
 * request() helper (api.js) specifically checks for to auto-clear the
 * stored session and redirect to /login.
 */
@Component
public class JwtAuthEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                          AuthenticationException authException) throws IOException, ServletException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write(
                "{\"error\":\"Your session has expired. Please log in again.\"}");
    }
}
