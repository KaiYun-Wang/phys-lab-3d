package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wky.backend.domain.dto.LoginRequest;
import com.wky.backend.domain.dto.LoginResponse;
import com.wky.backend.domain.dto.RegisterRequest;
import com.wky.backend.domain.dto.UserProfileResponse;
import com.wky.backend.domain.entity.User;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.UserMapper;
import com.wky.backend.service.IAuthService;
import com.wky.backend.utils.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl extends ServiceImpl<UserMapper, User> implements IAuthService {

    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    @Transactional
    public LoginResponse register(RegisterRequest request) {
        boolean exists = lambdaQuery()
                .eq(User::getUsername, request.getUsername())
                .exists();
        if (exists) {
            throw new ApiException(409, "用户名已存在");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setNickname(request.getUsername());
        save(user);

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        return new LoginResponse(token, UserProfileResponse.from(user));
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        User user = lambdaQuery()
                .eq(User::getUsername, request.getUsername())
                .one();
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ApiException(401, "用户名或密码错误");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        return new LoginResponse(token, UserProfileResponse.from(user));
    }
}
