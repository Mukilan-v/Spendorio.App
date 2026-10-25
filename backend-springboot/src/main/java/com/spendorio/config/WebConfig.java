package com.spendorio.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

/**
 * WebMvcConfigurer Configuration for:
 * 1. Global CORS (Allows phone, PWA, and tunnel access)
 * 2. Serving static frontend assets (HTML, CSS, JS, PWA icons) directly from the public/ folder
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${spendorio.public.dir:../public}")
    private String publicDirPath;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD")
                .allowedHeaders("*");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        File p1 = new File("c:/Users/acer/Documents/Task Cost/public").getAbsoluteFile();
        File p2 = new File("./public").getAbsoluteFile();
        File p3 = new File("../public").getAbsoluteFile();

        File publicDir = p1.exists() ? p1 : (p2.exists() ? p2 : (p3.exists() ? p3 : new File(publicDirPath)));
        String publicUri = publicDir.getAbsoluteFile().toURI().toString();
        if (!publicUri.endsWith("/")) {
            publicUri += "/";
        }

        // Map root and all sub-paths to the public frontend directory
        registry.addResourceHandler("/**")
                .addResourceLocations(publicUri, "classpath:/static/", "classpath:/public/")
                .setCachePeriod(0);
    }
}
