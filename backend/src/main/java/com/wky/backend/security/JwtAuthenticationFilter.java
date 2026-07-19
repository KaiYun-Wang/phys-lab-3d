package com.wky.backend.security;

import com.wky.backend.domain.entity.User;
import com.wky.backend.enums.UserStatus;
import com.wky.backend.mapper.UserMapper;
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
    private final UserMapper userMapper;

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
                if (AuthPrincipal.TYPE_USER.equals(principalType) && isDisabledUser(id)) {
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "账号已被禁用");
                    return;
                }

                AuthPrincipal principal = new AuthPrincipal(id, principalType);
                var auth = new UsernamePasswordAuthenticationToken(principal, null, List.of());
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        filterChain.doFilter(request, response);
    }

    private boolean isDisabledUser(Long userId) {
        if (userId == null) {
            return true;
        }
        User user = userMapper.selectById(userId);
        return user == null || user.getStatus() == UserStatus.DISABLED;
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
