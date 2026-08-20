package com.tap.controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {
    @GetMapping("/")
public String home() {
    return "Tap System API is running successfully!";
}

@GetMapping("/health")
public String health() {
    return "OK";
}
}
