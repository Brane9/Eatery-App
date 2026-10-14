package com.eatery.eaterybackend.controller;

import java.util.Map;

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

import com.eatery.eaterybackend.dto.JeloDTO;
import com.eatery.eaterybackend.dto.KategorijaDTO;
import com.eatery.eaterybackend.service.RestoranService;

@RestController
@RequestMapping("/api/restoran")
@CrossOrigin(origins = "*")
public class RestoranController {

    private final RestoranService restoranService;

    public RestoranController(RestoranService restoranService) {
        this.restoranService = restoranService;
    }

    @GetMapping("/{restoranId}/kategorije")
    public ResponseEntity<?> getKategorije(@PathVariable Long restoranId) {
        return ResponseEntity.ok(restoranService.getKategorije(restoranId));
    }

    @PostMapping("/{restoranId}/kategorije")
    public ResponseEntity<?> dodajKategoriju(@PathVariable Long restoranId,
                                             @RequestBody KategorijaDTO dto,
                                             Authentication authentication) {
        return ResponseEntity.ok(restoranService.dodajKategoriju(restoranId, dto, authentication));
    }

    @GetMapping("/{restoranId}/jela")
    public ResponseEntity<?> getJela(@PathVariable Long restoranId) {
        return ResponseEntity.ok(restoranService.getJela(restoranId));
    }

    @PostMapping("/{restoranId}/jela")
    public ResponseEntity<?> dodajJelo(@PathVariable Long restoranId,
                                       @RequestBody JeloDTO dto,
                                       Authentication authentication) {
        return ResponseEntity.ok(restoranService.dodajJelo(restoranId, dto, authentication));
    }

    @PutMapping("/{restoranId}/jela/{jeloId}")
    public ResponseEntity<?> izmijeniJelo(@PathVariable Long restoranId,
                                          @PathVariable Long jeloId,
                                          @RequestBody JeloDTO dto,
                                          Authentication authentication) {
        return ResponseEntity.ok(restoranService.izmijeniJelo(restoranId, jeloId, dto, authentication));
    }

    @DeleteMapping("/{restoranId}/jela/{jeloId}")
    public ResponseEntity<?> ukloniJelo(@PathVariable Long restoranId,
                                        @PathVariable Long jeloId,
                                        Authentication authentication) {
        return ResponseEntity.ok(restoranService.ukloniJelo(restoranId, jeloId, authentication));
    }

    @GetMapping("/{restoranId}/statistika")
    public ResponseEntity<?> getStatistika(@PathVariable Long restoranId, Authentication authentication) {
        return ResponseEntity.ok(restoranService.getStatistika(restoranId, authentication));
    }

    @GetMapping("/{restoranId}/narudzbe")
    public ResponseEntity<?> getNarudzbeZaRestoran(@PathVariable Long restoranId, Authentication authentication) {
        return ResponseEntity.ok(restoranService.getNarudzbe(restoranId, authentication));
    }

    @PutMapping("/narudzba/{narudzbaId}/status")
    public ResponseEntity<?> promijeniStatusNarudzbe(@PathVariable Long narudzbaId,
                                                     @RequestBody String noviStatus,
                                                     Authentication authentication) {
        return ResponseEntity.ok(restoranService.promijeniStatusNarudzbe(narudzbaId, noviStatus, authentication));
    }

    @PutMapping("/narudzba/{narudzbaId}/preuzimanje")
    public ResponseEntity<?> potvrdiPreuzimanjePinom(@PathVariable Long narudzbaId,
                                                     @RequestParam String pin,
                                                     Authentication authentication) {
        return ResponseEntity.ok(restoranService.potvrdiPreuzimanjePinom(narudzbaId, pin, authentication));
    }

    @GetMapping("/{restoranId}/profil")
    public ResponseEntity<?> getProfilRestorana(@PathVariable Long restoranId, Authentication authentication) {
        return ResponseEntity.ok(restoranService.getProfil(restoranId, authentication));
    }

    @PutMapping("/{restoranId}/profil")
    public ResponseEntity<?> azurirajProfilRestorana(@PathVariable Long restoranId,
                                                     @RequestBody Map<String, Object> body,
                                                     Authentication authentication) {
        return ResponseEntity.ok(restoranService.azurirajProfil(restoranId, body, authentication));
    }

    @PutMapping("/{restoranId}/naziv")
    public ResponseEntity<?> promijeniNazivObjekta(@PathVariable Long restoranId,
                                                   @RequestBody String noviNaziv,
                                                   Authentication authentication) {
        return ResponseEntity.ok(restoranService.promijeniNazivObjekta(restoranId, noviNaziv, authentication));
    }
}
