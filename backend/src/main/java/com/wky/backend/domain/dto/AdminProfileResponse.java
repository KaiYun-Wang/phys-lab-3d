package com.wky.backend.domain.dto;

import com.wky.backend.domain.entity.Admin;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminProfileResponse {

    private Long id;
    private String username;
    private String displayName;

    public static AdminProfileResponse from(Admin admin) {
        return new AdminProfileResponse(
                admin.getId(),
                admin.getUsername(),
                admin.getDisplayName()
        );
    }
}
