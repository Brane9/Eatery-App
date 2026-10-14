package com.eatery.eaterybackend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eatery.eaterybackend.dto.LoginRequestDTO;
import com.eatery.eaterybackend.dto.RegistracijaKlijentaDTO;
import com.eatery.eaterybackend.dto.RegistracijaKupcaDTO;
import com.eatery.eaterybackend.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/registracija/kupac")
    public ResponseEntity<?> registrujKupca(@RequestBody RegistracijaKupcaDTO dto) {
        return ResponseEntity.ok(authService.registrujKupca(dto));
    }

    @PostMapping("/registracija/klijent")
    public ResponseEntity<?> registrujKlijenta(@RequestBody RegistracijaKlijentaDTO dto) {
        return ResponseEntity.ok(authService.registrujKlijenta(dto));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDTO dto) {
        return ResponseEntity.ok(authService.login(dto));
    }
}
