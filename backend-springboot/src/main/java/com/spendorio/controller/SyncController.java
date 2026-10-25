package com.spendorio.controller;

import com.spendorio.service.DataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Spring Boot REST Controller for Financial & Routine Data Synchronization
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class SyncController {

    @Autowired
    private DataService dataService;

    // ─────────────────────────────────────────────────────────────────────────
    // LOAD USER DATA (GET /api/sync?userId=...)
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/sync")
    public ResponseEntity<Map<String, Object>> getData(@RequestParam(required = false) String userId) {
        Map<String, Object> resp = new HashMap<>();
        Map<String, Object> data = dataService.readUserData(userId);
        resp.put("success", true);
        resp.put("data", data);
        return ResponseEntity.ok(resp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SAVE USER DATA (POST /api/sync)
    // ─────────────────────────────────────────────────────────────────────────
    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> saveData(@RequestBody Map<String, Object> payload) {
        Map<String, Object> resp = new HashMap<>();
        if (payload == null) {
            resp.put("success", false);
            resp.put("message", "Payload is required");
            return ResponseEntity.badRequest().body(resp);
        }

        String userId = (String) payload.get("userId");
        boolean saved = dataService.saveUserData(userId, payload);

        if (!saved) {
            // Golden safeguard triggered
            resp.put("success", true);
            resp.put("message", "Owner data preserved by Golden Safeguard");
            resp.put("preserved", true);
            return ResponseEntity.ok(resp);
        }

        resp.put("success", true);
        resp.put("message", "Data synced successfully via Spring Boot");
        return ResponseEntity.ok(resp);
    }
}
