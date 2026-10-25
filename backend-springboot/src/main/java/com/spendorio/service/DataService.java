package com.spendorio.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spendorio.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

/**
 * DataService - High-Concurrency Thread-Safe Storage Manager
 * Handles JSON file persistence, atomic writes, multi-user isolation,
 * and the Golden Safeguard for the Primary Owner.
 */
@Service
public class DataService {

    private static final Logger log = LoggerFactory.getLogger(DataService.class);

    @Value("${spendorio.data.dir:../data}")
    private String dataDirPath;

    private final ObjectMapper mapper = new ObjectMapper();
    private final ReentrantLock userLock = new ReentrantLock();
    private final ReentrantLock syncLock = new ReentrantLock();

    private File dataDir;
    private File usersFile;
    private File usersBackupFile;
    private File ownerBackupFile;
    private File ownerBackupSafeFile;

    @PostConstruct
    public void init() {
        File d1 = new File("c:/Users/acer/Documents/Task Cost/data").getAbsoluteFile();
        File d2 = new File("./data").getAbsoluteFile();
        File d3 = new File("../data").getAbsoluteFile();

        if (new File(d1, "backup.json").exists()) {
            dataDir = d1;
        } else if (new File(d2, "backup.json").exists()) {
            dataDir = d2;
        } else if (new File(d3, "backup.json").exists()) {
            dataDir = d3;
        } else {
            dataDir = new File(dataDirPath).getAbsoluteFile();
        }

        if (!dataDir.exists()) {
            dataDir.mkdirs();
        }

        usersFile = new File(dataDir, "users.json");
        usersBackupFile = new File(dataDir, "users_backup.json");
        ownerBackupFile = new File(dataDir, "backup.json");
        ownerBackupSafeFile = new File(dataDir, "backup_safe.json");

        log.info("Spendorio DataService initialized at path: {}", dataDir.getAbsolutePath());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // USER MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    public List<User> readUsers() {
        userLock.lock();
        try {
            if (usersFile.exists() && usersFile.length() > 0) {
                try {
                    List<User> list = mapper.readValue(usersFile, new TypeReference<List<User>>() {});
                    if (list != null && !list.isEmpty()) {
                        return ensurePrimaryOwner(list);
                    }
                } catch (Exception e) {
                    log.warn("Failed reading users.json, attempting users_backup.json restore: {}", e.getMessage());
                }
            }

            if (usersBackupFile.exists() && usersBackupFile.length() > 0) {
                try {
                    List<User> list = mapper.readValue(usersBackupFile, new TypeReference<List<User>>() {});
                    if (list != null && !list.isEmpty()) {
                        safeWriteAtomic(usersFile, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(list));
                        return ensurePrimaryOwner(list);
                    }
                } catch (Exception e) {
                    log.error("Failed reading users_backup.json: {}", e.getMessage());
                }
            }

            return ensurePrimaryOwner(new ArrayList<>());
        } finally {
            userLock.unlock();
        }
    }

    public void saveUsers(List<User> users) {
        userLock.lock();
        try {
            List<User> safeUsers = ensurePrimaryOwner(users);
            String json = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(safeUsers);
            safeWriteAtomic(usersFile, json);
            try {
                safeWriteAtomic(usersBackupFile, json);
            } catch (Exception e) {
                log.warn("Failed saving mirror users_backup.json: {}", e.getMessage());
            }
        } catch (Exception e) {
            log.error("Error saving users: {}", e.getMessage(), e);
            throw new RuntimeException("Could not persist users", e);
        } finally {
            userLock.unlock();
        }
    }

    private List<User> ensurePrimaryOwner(List<User> list) {
        if (list == null) list = new ArrayList<>();
        boolean hasOwner = list.stream().anyMatch(u ->
                "user-mukiviswa".equals(u.getId()) ||
                "mukilanviswa".equalsIgnoreCase(u.getUsername()) ||
                Boolean.TRUE.equals(u.getIsOwner())
        );

        if (!hasOwner) {
            User owner = new User("user-mukiviswa", "MukilanViswa", "Demo@1234", "mukilanviswa@gmail.com", "Mukilan Viswa", true);
            owner.setPhone("9876543210");
            owner.setAliases(Arrays.asList("MukiViswa", "mukiviswa", "mukilan", "MukilanViswa"));
            owner.setCreatedAt("2026-10-18T10:00:00.000Z");
            owner.setDob("2004-09-12");
            list.add(0, owner);
        }
        return list;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DATA SYNC & BACKUP
    // ─────────────────────────────────────────────────────────────────────────

    public File getUserBackupFile(String userId) {
        if (userId == null || userId.trim().isEmpty() || "user-mukiviswa".equals(userId)) {
            return ownerBackupFile;
        }
        String safeId = userId.replaceAll("[^a-zA-Z0-9_-]", "");
        return new File(dataDir, "backup_" + safeId + ".json");
    }

    public Map<String, Object> readUserData(String userId) {
        syncLock.lock();
        try {
            boolean isOwner = userId == null || userId.trim().isEmpty() || "user-mukiviswa".equals(userId);
            File target = getUserBackupFile(userId);

            if (target.exists() && target.length() > 0) {
                try {
                    return mapper.readValue(target, new TypeReference<Map<String, Object>>() {});
                } catch (Exception e) {
                    log.warn("Failed to parse user file for {}: {}", userId, e.getMessage());
                }
            }

            if (isOwner) {
                // Golden fallback if backup.json was ever unreadable
                if (ownerBackupSafeFile.exists() && ownerBackupSafeFile.length() > 0) {
                    try {
                        return mapper.readValue(ownerBackupSafeFile, new TypeReference<Map<String, Object>>() {});
                    } catch (Exception ignored) {}
                }
            }

            // Clean starter container for fresh users
            Map<String, Object> starter = new LinkedHashMap<>();
            starter.put("userId", userId != null ? userId : "user-mukiviswa");
            starter.put("expenses", new ArrayList<>());
            starter.put("tasks", new ArrayList<>());
            starter.put("incomes", new ArrayList<>());
            Map<String, Object> streak = new HashMap<>();
            streak.put("currentStreak", 0);
            streak.put("bestStreak", 0);
            streak.put("lastActiveDate", "");
            starter.put("streaks", streak);
            return starter;
        } finally {
            syncLock.unlock();
        }
    }

    public boolean saveUserData(String userId, Map<String, Object> data) {
        syncLock.lock();
        try {
            boolean isOwner = userId == null || userId.trim().isEmpty() || "user-mukiviswa".equals(userId);
            File target = getUserBackupFile(userId);

            // ─────────────────────────────────────────────────────────────────
            // GOLDEN SAFEGUARD FOR OWNER:
            // Never overwrite owner server backup if payload has fewer than 50 expenses!
            // ─────────────────────────────────────────────────────────────────
            Object expensesObj = data.get("expenses");
            int expenseCount = (expensesObj instanceof List) ? ((List<?>) expensesObj).size() : 0;

            if (isOwner && expenseCount < 50) {
                if (target.exists() && target.length() > 0) {
                    try {
                        Map<String, Object> existing = mapper.readValue(target, new TypeReference<Map<String, Object>>() {});
                        Object existingExpenses = existing.get("expenses");
                        if (existingExpenses instanceof List && ((List<?>) existingExpenses).size() >= 50) {
                            log.warn("[DataService Safeguard] Blocked owner sync with only {} expenses. Preserved existing {} expenses.",
                                    expenseCount, ((List<?>) existingExpenses).size());
                            return false;
                        }
                    } catch (Exception ignored) {}
                }
            }

            String json = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(data);
            safeWriteAtomic(target, json);

            // Mirror owner data into backup_safe.json
            if (isOwner && expenseCount >= 50) {
                try {
                    safeWriteAtomic(ownerBackupSafeFile, json);
                } catch (Exception ignored) {}
            }

            return true;
        } catch (Exception e) {
            log.error("Failed saving user data for {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Could not persist data", e);
        } finally {
            syncLock.unlock();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ATOMIC FILE OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────

    private void safeWriteAtomic(File destination, String content) throws IOException {
        File dir = destination.getParentFile();
        if (!dir.exists()) dir.mkdirs();

        File temp = new File(dir, "." + destination.getName() + "." + System.currentTimeMillis() + ".tmp");
        Files.writeString(temp.toPath(), content, StandardCharsets.UTF_8);

        int attempts = 0;
        while (true) {
            try {
                attempts++;
                Files.move(temp.toPath(), destination.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
                break;
            } catch (Exception err) {
                if (attempts >= 5) {
                    // Fallback to standard copy
                    Files.copy(temp.toPath(), destination.toPath(), StandardCopyOption.REPLACE_EXISTING);
                    try { Files.deleteIfExists(temp.toPath()); } catch (Exception ignored) {}
                    break;
                }
                try { Thread.sleep(20L * attempts); } catch (InterruptedException ignored) {}
            }
        }
    }
}
