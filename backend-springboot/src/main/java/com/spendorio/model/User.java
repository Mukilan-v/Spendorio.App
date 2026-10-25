package com.spendorio.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * User Model Entity representing an authenticated Spendorio user
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class User {
    private String id;
    private String username;
    private String password;
    private String email;
    private String phone;
    private String fullName;
    private String dob;
    private String profileImage;
    private Boolean isOwner;
    private String createdAt;
    private String updatedAt;
    private List<String> aliases;

    public User() {}

    public User(String id, String username, String password, String email, String fullName, Boolean isOwner) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.email = email;
        this.fullName = fullName;
        this.isOwner = isOwner;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getDob() { return dob; }
    public void setDob(String dob) { this.dob = dob; }

    public String getProfileImage() { return profileImage; }
    public void setProfileImage(String profileImage) { this.profileImage = profileImage; }

    public Boolean getIsOwner() { return isOwner; }
    public void setIsOwner(Boolean isOwner) { this.isOwner = isOwner; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

    public List<String> getAliases() { return aliases; }
    public void setAliases(List<String> aliases) { this.aliases = aliases; }

    /**
     * Sanitized copy without password for safe API responses
     */
    public User toSafeUser() {
        User safe = new User();
        safe.setId(this.id);
        safe.setUsername(this.username);
        safe.setEmail(this.email);
        safe.setPhone(this.phone);
        safe.setFullName(this.fullName);
        safe.setDob(this.dob);
        safe.setProfileImage(this.profileImage);
        safe.setIsOwner(this.isOwner);
        safe.setCreatedAt(this.createdAt);
        safe.setUpdatedAt(this.updatedAt);
        return safe;
    }
}
