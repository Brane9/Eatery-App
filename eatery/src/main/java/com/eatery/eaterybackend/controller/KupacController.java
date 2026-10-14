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
import org.springframework.web.bind.annotation.RestController;

import com.eatery.eaterybackend.dto.KreirajNarudzbuDTO;
import com.eatery.eaterybackend.dto.UpdateKupacProfilDTO;
import com.eatery.eaterybackend.service.KupacService;

@RestController
@RequestMapping("/api/kupac")
@CrossOrigin(origins = "*")
public class KupacController {

    private final KupacService kupacService;

    public KupacController(KupacService kupacService) {
        this.kupacService = kupacService;
    }

    @GetMapping("/profil/{kupacId}")
    public ResponseEntity<?> getProfilKupca(@PathVariable Long kupacId, Authentication authentication) {
        return ResponseEntity.ok(kupacService.getProfil(kupacId, authentication));
    }

    @PutMapping("/profil/{kupacId}")
    public ResponseEntity<?> updateProfilKupca(@PathVariable Long kupacId,
                                               @RequestBody UpdateKupacProfilDTO dto,
                                               Authentication authentication) {
        return ResponseEntity.ok(kupacService.updateProfil(kupacId, dto, authentication));
    }

    @GetMapping("/restorani")
    public ResponseEntity<?> getAktivniRestorani() {
        return ResponseEntity.ok(kupacService.getAktivniRestorani());
    }

    @PostMapping("/narudzba")
    public ResponseEntity<?> kreirajNarudzbu(@RequestBody KreirajNarudzbuDTO dto, Authentication authentication) {
        return ResponseEntity.ok(kupacService.kreirajNarudzbu(dto, authentication));
    }

    @GetMapping("/restoran/{restoranId}/jela")
    public ResponseEntity<?> getJelaZaRestoran(@PathVariable Long restoranId) {
        return ResponseEntity.ok(kupacService.getJelaZaRestoran(restoranId));
    }

    @GetMapping("/narudzbe/{kupacId}")
    public ResponseEntity<?> getNarudzbeKupca(@PathVariable Long kupacId, Authentication authentication) {
        return ResponseEntity.ok(kupacService.getNarudzbeKupca(kupacId, authentication));
    }
}
