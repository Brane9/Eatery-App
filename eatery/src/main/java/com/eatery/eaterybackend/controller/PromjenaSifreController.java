package com.eatery.eaterybackend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eatery.eaterybackend.dto.PromjenaSifreDTO;
import com.eatery.eaterybackend.service.PromjenaSifreService;

@RestController
@RequestMapping("/api/korisnik/promjena-sifre")
@CrossOrigin(origins = "*")
public class PromjenaSifreController {

    private final PromjenaSifreService promjenaSifreService;

    public PromjenaSifreController(PromjenaSifreService promjenaSifreService) {
        this.promjenaSifreService = promjenaSifreService;
    }

    @GetMapping
    public ResponseEntity<?> status(Authentication authentication) {
        return ResponseEntity.ok(promjenaSifreService.status(authentication));
    }

    @PostMapping
    public ResponseEntity<?> posaljiZahtjev(@RequestBody PromjenaSifreDTO dto, Authentication authentication) {
        return ResponseEntity.ok(promjenaSifreService.posaljiZahtjev(dto, authentication));
    }
}
