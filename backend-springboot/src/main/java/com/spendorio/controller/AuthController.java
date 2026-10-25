package com.spendorio.controller;

import com.spendorio.model.User;
import com.spendorio.service.DataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Spring Boot REST Controller for Authentication, Registration, and Profile Management
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private DataService dataService;

    // ─────────────────────────────────────────────────────────────────────────
    // CHECK AVAILABILITY
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/check-availability")
    public ResponseEntity<Map<String, Object>> checkAvailability(
            @RequestParam(required = false) String field,
            @RequestParam(required = false) String value) {

        Map<String, Object> resp = new HashMap<>();
        if (field == null || value == null) {
            resp.put("success", false);
            resp.put("message", "field and value are required");
            return ResponseEntity.badRequest().body(resp);
        }

        String clean = value.trim().toLowerCase();
        if (clean.isEmpty()) {
            resp.put("success", true);
            resp.put("available", true);
            return ResponseEntity.ok(resp);
        }

        List<User> users = dataService.readUsers();

        if ("username".equalsIgnoreCase(field)) {
            boolean taken = users.stream().anyMatch(u -> u.getUsername() != null && u.getUsername().trim().equalsIgnoreCase(clean));
            resp.put("success", true);
            resp.put("available", !taken);
            resp.put("field", "username");
            resp.put("message", taken ? "⚠️ This Username is already used! Please choose a different username." : "✓ Username is available");
            return ResponseEntity.ok(resp);
        }

        if ("email".equalsIgnoreCase(field)) {
            boolean taken = users.stream().anyMatch(u -> u.getEmail() != null && u.getEmail().trim().equalsIgnoreCase(clean));
            resp.put("success", true);
            resp.put("available", !taken);
            resp.put("field", "email");
            resp.put("message", taken ? "⚠️ This Gmail / Email is already used! Please choose a different email or Log In." : "✓ Gmail / Email is available");
            return ResponseEntity.ok(resp);
        }

        if ("phone".equalsIgnoreCase(field)) {
            String cleanPhone = value.trim();
            boolean taken = cleanPhone.length() >= 7 && users.stream().anyMatch(u -> cleanPhone.equals(u.getPhone() != null ? u.getPhone().trim() : ""));
            resp.put("success", true);
            resp.put("available", !taken);
            resp.put("field", "phone");
            resp.put("message", taken ? "⚠️ This Phone Number is already used! Please use a different phone." : "✓ Phone number is available");
            return ResponseEntity.ok(resp);
        }

        resp.put("success", true);
        resp.put("available", true);
        return ResponseEntity.ok(resp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REGISTER
    // ─────────────────────────────────────────────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody(required = false) Map<String, Object> payload) {
        Map<String, Object> resp = new HashMap<>();
        if (payload == null) {
            resp.put("success", false);
            resp.put("message", "Request body is required");
            return ResponseEntity.badRequest().body(resp);
        }

        String username = (String) payload.get("username");
        String password = (String) payload.get("password");
        String email = (String) payload.get("email");
        String phone = (String) payload.get("phone");
        String fullName = (String) payload.get("fullName");

        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            resp.put("success", false);
            resp.put("message", "Username and password are required");
            return ResponseEntity.badRequest().body(resp);
        }

        List<User> users = dataService.readUsers();

        // 1. Check Username
        boolean userTaken = users.stream().anyMatch(u -> u.getUsername() != null && u.getUsername().trim().equalsIgnoreCase(username.trim()));
        if (userTaken) {
            resp.put("success", false);
            resp.put("field", "username");
            resp.put("message", "⚠️ This Username (\"" + username + "\") is already used! Please choose a different username.");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(resp);
        }

        // 2. Check Email
        if (email != null && !email.trim().isEmpty()) {
            boolean emailTaken = users.stream().anyMatch(u -> u.getEmail() != null && u.getEmail().trim().equalsIgnoreCase(email.trim()));
            if (emailTaken) {
                resp.put("success", false);
                resp.put("field", "email");
                resp.put("message", "⚠️ This Gmail / Email (\"" + email + "\") is already used! Please enter a different email or Log In.");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(resp);
            }
        }

        String assignedId = "user-" + System.currentTimeMillis() + "-" + (int)(Math.random() * 10000);
        User newUser = new User();
        newUser.setId(assignedId);
        newUser.setUsername(username.trim());
        newUser.setPassword(password);
        newUser.setEmail(email != null ? email.trim() : "");
        newUser.setPhone(phone != null ? phone.trim() : "");
        newUser.setFullName(fullName != null && !fullName.trim().isEmpty() ? fullName.trim() : username.trim());
        newUser.setIsOwner(false);
        newUser.setCreatedAt(Instant.now().toString());

        users.add(newUser);
        dataService.saveUsers(users);

        resp.put("success", true);
        resp.put("message", "Account registered successfully");
        resp.put("user", newUser.toSafeUser());
        return ResponseEntity.ok(resp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LOGIN
    // ─────────────────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody(required = false) Map<String, String> payload) {
        Map<String, Object> resp = new HashMap<>();
        if (payload == null) {
            resp.put("success", false);
            resp.put("message", "Payload is required");
            return ResponseEntity.badRequest().body(resp);
        }

        String identifier = payload.get("identifier");
        String password = payload.get("password");

        if (identifier == null || identifier.trim().isEmpty() || password == null) {
            resp.put("success", false);
            resp.put("message", "Username/Email/Phone and password are required");
            return ResponseEntity.badRequest().body(resp);
        }

        String idLower = identifier.trim().toLowerCase();
        String idClean = idLower.replaceAll("\\s+", "");

        List<User> users = dataService.readUsers();

        User matchedUser = null;
        for (User u : users) {
            String uLower = (u.getUsername() != null ? u.getUsername() : "").toLowerCase().trim();
            String uClean = uLower.replaceAll("\\s+", "");
            String fLower = (u.getFullName() != null ? u.getFullName() : "").toLowerCase().trim();
            String fClean = fLower.replaceAll("\\s+", "");
            String eLower = (u.getEmail() != null ? u.getEmail() : "").toLowerCase().trim();
            String pClean = (u.getPhone() != null ? u.getPhone() : "").trim();
            List<String> aliases = u.getAliases() != null ? u.getAliases() : Collections.emptyList();

            boolean match = uLower.equals(idLower) ||
                    uClean.equals(idClean) ||
                    fLower.equals(idLower) ||
                    fClean.equals(idClean) ||
                    eLower.equals(idLower) ||
                    pClean.equals(identifier.trim()) ||
                    aliases.stream().anyMatch(a -> a.equalsIgnoreCase(idLower) || a.equalsIgnoreCase(idClean)) ||
                    (idClean.equals("mukilanviswa") && (uClean.equals("mukiviswa") || Boolean.TRUE.equals(u.getIsOwner()))) ||
                    (idClean.equals("mukiviswa") && (uClean.equals("mukilanviswa") || Boolean.TRUE.equals(u.getIsOwner())));

            if (match) {
                matchedUser = u;
                break;
            }
        }

        if (matchedUser == null || !password.equals(matchedUser.getPassword())) {
            resp.put("success", false);
            resp.put("message", "Invalid username, email, phone or password");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(resp);
        }

        resp.put("success", true);
        resp.put("user", matchedUser.toSafeUser());
        return ResponseEntity.ok(resp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // USER LIST
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> getUsers() {
        Map<String, Object> resp = new HashMap<>();
        List<User> safeUsers = dataService.readUsers().stream()
                .map(User::toSafeUser)
                .collect(Collectors.toList());
        resp.put("success", true);
        resp.put("users", safeUsers);
        return ResponseEntity.ok(resp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE PASSWORD
    // ─────────────────────────────────────────────────────────────────────────
    @PutMapping("/update-password")
    public ResponseEntity<Map<String, Object>> updatePassword(@RequestBody Map<String, String> payload) {
        Map<String, Object> resp = new HashMap<>();
        String email = payload != null ? payload.get("email") : null;
        String newPassword = payload != null ? payload.get("newPassword") : null;

        if (email == null || newPassword == null || newPassword.length() < 3) {
            resp.put("success", false);
            resp.put("message", "Valid email and new password (min 3 chars) required.");
            return ResponseEntity.badRequest().body(resp);
        }

        List<User> users = dataService.readUsers();
        Optional<User> opt = users.stream().filter(u -> email.trim().equalsIgnoreCase(u.getEmail())).findFirst();
        if (opt.isEmpty()) {
            resp.put("success", false);
            resp.put("message", "No account found with this email.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(resp);
        }

        opt.get().setPassword(newPassword);
        dataService.saveUsers(users);

        resp.put("success", true);
        resp.put("message", "Password updated successfully.");
        return ResponseEntity.ok(resp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE PROFILE
    // ─────────────────────────────────────────────────────────────────────────
    @PutMapping("/update-profile")
    public ResponseEntity<Map<String, Object>> updateProfile(@RequestBody Map<String, Object> payload) {
        Map<String, Object> resp = new HashMap<>();
        if (payload == null) {
            resp.put("success", false);
            resp.put("message", "Payload is required");
            return ResponseEntity.badRequest().body(resp);
        }

        String id = (String) payload.get("id");
        String username = (String) payload.get("username");
        String email = (String) payload.get("email");

        List<User> users = dataService.readUsers();
        User target = null;
        for (User u : users) {
            if ((id != null && id.equals(u.getId())) ||
                (username != null && username.trim().equalsIgnoreCase(u.getUsername())) ||
                (email != null && email.trim().equalsIgnoreCase(u.getEmail()))) {
                target = u;
                break;
            }
        }

        if (target == null) {
            resp.put("success", false);
            resp.put("message", "User not found.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(resp);
        }

        if (payload.containsKey("username")) target.setUsername(((String) payload.get("username")).trim());
        if (payload.containsKey("fullName")) target.setFullName(((String) payload.get("fullName")).trim());
        if (payload.containsKey("email")) target.setEmail(((String) payload.get("email")).trim());
        if (payload.containsKey("phone")) target.setPhone(((String) payload.get("phone")).trim());
        if (payload.containsKey("dob")) target.setDob((String) payload.get("dob"));
        if (payload.containsKey("profileImage")) target.setProfileImage((String) payload.get("profileImage"));
        target.setUpdatedAt(Instant.now().toString());

        dataService.saveUsers(users);

        resp.put("success", true);
        resp.put("user", target.toSafeUser());
        return ResponseEntity.ok(resp);
    }
}
