package com.eatery.eaterybackend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.eatery.eaterybackend.dto.NarudzbaDTO;
import com.eatery.eaterybackend.service.NarudzbaService;

@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@RestController
@RequestMapping("/api/narudzbe")
public class NarudzbaController {

    private final NarudzbaService narudzbaService;

    public NarudzbaController(NarudzbaService narudzbaService) {
        this.narudzbaService = narudzbaService;
    }

    @PostMapping
    public ResponseEntity<?> kreirajNarudzbu(@RequestBody NarudzbaDTO dto, Authentication authentication) {
        return ResponseEntity.ok(narudzbaService.kreirajNarudzbu(dto, authentication));
    }

    @GetMapping("/restoran/{restoranId}")
    public ResponseEntity<?> getNarudzbeZaRestoran(@PathVariable("restoranId") Long restoranId,
                                                   Authentication authentication) {
        return ResponseEntity.ok(narudzbaService.getNarudzbeZaRestoran(restoranId, authentication));
    }

    @GetMapping("/kupac/{kupacId}")
    public ResponseEntity<?> getNarudzbeZaKupca(@PathVariable("kupacId") Long kupacId,
                                                Authentication authentication) {
        return ResponseEntity.ok(narudzbaService.getNarudzbeZaKupca(kupacId, authentication));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> promjeniStatus(@PathVariable("id") Long id,
                                            @RequestParam("status") String status,
                                            Authentication authentication) {
        return ResponseEntity.ok(narudzbaService.promjeniStatus(id, status, authentication));
    }
}
