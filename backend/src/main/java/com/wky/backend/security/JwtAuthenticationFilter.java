package com.wky.backend.security;

import com.wky.backend.utils.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtUtil.isValid(token)) {
                String principalType = jwtUtil.getPrincipalType(token);
                String path = request.getRequestURI();

                if (requiresAdmin(path) && !AuthPrincipal.TYPE_ADMIN.equals(principalType)) {
                    response.sendError(HttpServletResponse.SC_FORBIDDEN);
                    return;
                }
                if (requiresUser(path) && !AuthPrincipal.TYPE_USER.equals(principalType)) {
                    response.sendError(HttpServletResponse.SC_FORBIDDEN);
                    return;
                }

                Long id = jwtUtil.getPrincipalId(token);
                AuthPrincipal principal = new AuthPrincipal(id, principalType);
                var auth = new UsernamePasswordAuthenticationToken(principal, null, List.of());
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        filterChain.doFilter(request, response);
    }

    private static boolean requiresAdmin(String path) {
        if (!path.startsWith("/api/admin/")) {
            return false;
        }
        return !path.equals("/api/admin/auth/login");
    }

    private static boolean requiresUser(String path) {
        return path.startsWith("/api/users/");
    }
}
