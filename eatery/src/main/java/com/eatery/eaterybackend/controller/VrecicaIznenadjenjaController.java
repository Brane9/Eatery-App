package com.eatery.eaterybackend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.eatery.eaterybackend.dto.VrecicaIznenadjenjaDTO;
import com.eatery.eaterybackend.service.VrecicaIznenadjenjaService;

@RestController
@RequestMapping("/api/vrecice")
@CrossOrigin(origins = "*")
public class VrecicaIznenadjenjaController {

    private final VrecicaIznenadjenjaService vrecicaIznenadjenjaService;

    public VrecicaIznenadjenjaController(VrecicaIznenadjenjaService vrecicaIznenadjenjaService) {
        this.vrecicaIznenadjenjaService = vrecicaIznenadjenjaService;
    }

    @GetMapping("/aktivne")
    public ResponseEntity<?> getAktivneVrecice(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng) {

        return ResponseEntity.ok(vrecicaIznenadjenjaService.getAktivne(lat, lng));
    }

    @GetMapping("/restoran/{restoranId}")
    public ResponseEntity<?> getVreciceZaRestoran(@PathVariable Long restoranId, Authentication authentication) {
        return ResponseEntity.ok(vrecicaIznenadjenjaService.getZaRestoran(restoranId, authentication));
    }

    @PostMapping("/restoran/{restoranId}")
    public ResponseEntity<?> dodajVrecicu(@PathVariable Long restoranId,
                                          @RequestBody VrecicaIznenadjenjaDTO dto,
                                          Authentication authentication) {
        return ResponseEntity.ok(vrecicaIznenadjenjaService.dodaj(restoranId, dto, authentication));
    }

    @PutMapping("/{vrecicaId}")
    public ResponseEntity<?> izmijeniVrecicu(@PathVariable Long vrecicaId,
                                             @RequestBody VrecicaIznenadjenjaDTO dto,
                                             Authentication authentication) {
        return ResponseEntity.ok(vrecicaIznenadjenjaService.izmijeni(vrecicaId, dto, authentication));
    }

    @DeleteMapping("/{vrecicaId}")
    public ResponseEntity<?> ukloniVrecicu(@PathVariable Long vrecicaId, Authentication authentication) {
        return ResponseEntity.ok(vrecicaIznenadjenjaService.ukloni(vrecicaId, authentication));
    }

    @PutMapping("/{vrecicaId}/status")
    public ResponseEntity<?> promijeniStatus(@PathVariable Long vrecicaId,
                                             @RequestParam Boolean aktivna,
                                             Authentication authentication) {
        return ResponseEntity.ok(vrecicaIznenadjenjaService.promijeniStatus(vrecicaId, aktivna, authentication));
    }

    @PutMapping("/{vrecicaId}/kolicina")
    public ResponseEntity<?> azurirajKolicinu(@PathVariable Long vrecicaId,
                                              @RequestParam Integer kolicina,
                                              Authentication authentication) {
        return ResponseEntity.ok(vrecicaIznenadjenjaService.azurirajKolicinu(vrecicaId, kolicina, authentication));
    }
}
