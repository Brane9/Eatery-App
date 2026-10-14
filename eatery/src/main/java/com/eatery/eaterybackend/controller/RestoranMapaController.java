package com.eatery.eaterybackend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.eatery.eaterybackend.dto.UpdateKlijentProfilDTO;
import com.eatery.eaterybackend.service.RestoranMapaService;

@RestController
@RequestMapping("/api/restorani")
@CrossOrigin(origins = "*")
public class RestoranMapaController {

    private final RestoranMapaService restoranMapaService;

    public RestoranMapaController(RestoranMapaService restoranMapaService) {
        this.restoranMapaService = restoranMapaService;
    }

    @PutMapping("/{restoranId}/lokacija")
    public ResponseEntity<?> azurirajLokacijuRestorana(@PathVariable Long restoranId,
                                                       @RequestBody UpdateKlijentProfilDTO dto,
                                                       Authentication authentication) {
        return ResponseEntity.ok(restoranMapaService.azurirajLokaciju(restoranId, dto, authentication));
    }

    @GetMapping("/{restoranId}/lokacija")
    public ResponseEntity<?> getLokacijaRestorana(@PathVariable Long restoranId) {
        return ResponseEntity.ok(restoranMapaService.getLokacija(restoranId));
    }

    @GetMapping("/u-blizini")
    public ResponseEntity<?> getRestoraniUBlizini(@RequestParam double lat,
                                                  @RequestParam double lng,
                                                  @RequestParam(defaultValue = "5.0") double radijusKm) {
        return ResponseEntity.ok(restoranMapaService.getRestoraniUBlizini(lat, lng, radijusKm));
    }
}
