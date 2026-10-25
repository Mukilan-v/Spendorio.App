package com.spendorio.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Health Check Controller for monitoring and uptime verification
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        response.put("framework", "Spring Boot 3.3.4");
        response.put("runtime", "Java " + System.getProperty("java.version"));
        response.put("timestamp", Instant.now().toString());
        response.put("uptime", ManagementFactory.getRuntimeMXBean().getUptime() / 1000.0);
        return ResponseEntity.ok(response);
    }
}
