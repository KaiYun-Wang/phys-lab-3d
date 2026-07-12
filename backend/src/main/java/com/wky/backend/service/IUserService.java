package com.wky.backend.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wky.backend.domain.dto.ChangePasswordRequest;
import com.wky.backend.domain.dto.UpdateProfileRequest;
import com.wky.backend.domain.dto.UserProfileResponse;
import com.wky.backend.domain.entity.User;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface IUserService extends IService<User> {

    User requireUser(Long userId);

    UserProfileResponse getProfile(Long userId);

    UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request);

    void changePassword(Long userId, ChangePasswordRequest request);

    UserProfileResponse uploadAvatar(Long userId, MultipartFile file) throws IOException;

    UserProfileResponse resetAvatar(Long userId);
}
