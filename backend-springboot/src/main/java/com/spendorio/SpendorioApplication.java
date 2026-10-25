package com.spendorio;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spendorio Spring Boot Main Application Entry Point
 * Java Full-Stack Backend for Spendorio PWA
 */
@SpringBootApplication
public class SpendorioApplication {

    public static void main(String[] args) {
        SpringApplication.run(SpendorioApplication.class, args);
        System.out.println("====================================================");
        System.out.println(" Spendorio Spring Boot Backend Successfully Started! ");
        System.out.println(" Embedded Tomcat Port: 3000                        ");
        System.out.println(" Local Access: http://localhost:3000              ");
        System.out.println(" Java Version: " + System.getProperty("java.version"));
        System.out.println("====================================================");
    }
}
