package com.eatery.eaterybackend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eatery.eaterybackend.dto.KreirajRecenzijuDTO;
import com.eatery.eaterybackend.service.RecenzijaService;

@RestController
@RequestMapping("/api/recenzije")
@CrossOrigin(origins = "http://localhost:5173")
public class RecenzijaController {

    private final RecenzijaService recenzijaService;

    public RecenzijaController(RecenzijaService recenzijaService) {
        this.recenzijaService = recenzijaService;
    }

    @PostMapping
    public ResponseEntity<?> dodajRecenziju(@RequestBody KreirajRecenzijuDTO dto, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recenzijaService.dodajRecenziju(dto, authentication));
    }

    @GetMapping("/moja-ocjena")
    public ResponseEntity<?> getMojaOcjena(Authentication authentication) {
        return ResponseEntity.ok(recenzijaService.mojaOcjena(authentication));
    }

    @GetMapping("/restoran/{idRestorana}")
    public ResponseEntity<?> getRecenzijeZaRestoran(@PathVariable Long idRestorana) {
        return ResponseEntity.ok(recenzijaService.recenzijeZaRestoran(idRestorana));
    }

    @GetMapping("/restoran/{idRestorana}/ocjena")
    public ResponseEntity<?> getOcjenaZaRestoran(@PathVariable Long idRestorana) {
        return ResponseEntity.ok(recenzijaService.ocjenaZaRestoran(idRestorana));
    }

    @GetMapping("/provjeri/{idNarudzbe}")
    public ResponseEntity<Boolean> jeOcjenjena(@PathVariable Long idNarudzbe) {
        return ResponseEntity.ok(recenzijaService.jeOcjenjena(idNarudzbe));
    }
}
