package com.wky.backend.utils;

import com.wky.backend.security.AuthPrincipal;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(
            @Value("${phys-lab.jwt.secret}") String secret,
            @Value("${phys-lab.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(sha256(secret));
        this.expirationMs = expirationMs;
    }

    private static byte[] sha256(String secret) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public String generateToken(Long id, String username, String principalType) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(id))
                .claim("username", username)
                .claim("principalType", principalType)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValid(String token) {
        try {
            parseToken(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Long getPrincipalId(String token) {
        return Long.parseLong(parseToken(token).getSubject());
    }

    public String getPrincipalType(String token) {
        Claims claims = parseToken(token);
        String type = claims.get("principalType", String.class);
        return type != null ? type : AuthPrincipal.TYPE_USER;
    }
}
