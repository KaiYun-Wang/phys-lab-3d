package com.wky.backend.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wky.backend.domain.dto.LoginRequest;
import com.wky.backend.domain.dto.LoginResponse;
import com.wky.backend.domain.dto.RegisterRequest;
import com.wky.backend.domain.entity.User;

public interface IAuthService extends IService<User> {

    LoginResponse register(RegisterRequest request);

    LoginResponse login(LoginRequest request);
}
