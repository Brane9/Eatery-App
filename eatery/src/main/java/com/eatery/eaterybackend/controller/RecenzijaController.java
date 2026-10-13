package com.eatery.eaterybackend.controller;

import com.eatery.eaterybackend.dto.KreirajRecenzijuDTO;
import com.eatery.eaterybackend.entity.KorisnikEntity;
import com.eatery.eaterybackend.entity.NarudzbaEntity;
import com.eatery.eaterybackend.entity.RecenzijaEntity;
import com.eatery.eaterybackend.repository.KorisnikRepository;
import com.eatery.eaterybackend.repository.NarudzbaRepository;
import com.eatery.eaterybackend.repository.RecenzijaRepository;
import com.eatery.eaterybackend.service.RecenzijaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/recenzije")
@CrossOrigin(origins = "http://localhost:5173")
public class RecenzijaController {

    @Autowired
    private RecenzijaRepository recenzijaRepository;

    @Autowired
    private NarudzbaRepository narudzbaRepository;

    @Autowired
    private KorisnikRepository korisnikRepository;

    @Autowired
    private RecenzijaService recenzijaService;

    // 1. OSTAVI RECENZIJU (Poziva Kupac)
    @PostMapping
    public ResponseEntity<?> dodajRecenziju(@RequestBody KreirajRecenzijuDTO dto, Authentication authentication) {
        if (dto.getOcjena() == null || dto.getOcjena() < 1 || dto.getOcjena() > 5) {
            return ResponseEntity.badRequest().body("Ocjena mora biti između 1 i 5.");
        }

        // Pronađi narudžbu
        NarudzbaEntity narudzba = narudzbaRepository.findById(dto.getIdNarudzbe())
                .orElse(null);
        if (narudzba == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Narudžba nije pronađena.");
        }

        // Provjera statusa narudžbe - samo DOSTAVLJENO ili PREUZETO se može ocjenjivati
        String status = narudzba.getStatus() != null ? narudzba.getStatus().toUpperCase() : "";
        if (!status.equals("DOSTAVLJENO") && !status.equals("PREUZETO")) {
            return ResponseEntity.badRequest().body("Moguće je ocjenjivati samo realizovane (dostavljene/preuzete) narudžbe.");
        }

        // Provjera da li je narudžba već ocjenjena
        if (recenzijaRepository.existsByNarudzbaId(dto.getIdNarudzbe())) {
            return ResponseEntity.badRequest().body("Ova narudžba je već ocjenjena.");
        }

        // Pronađi ulogovanog kupca iz JWT-a (provjerava i email i korisničko ime)
        String usernameOrEmail = authentication.getName();
        KorisnikEntity kupac = korisnikRepository.findByEmail(usernameOrEmail)
                .orElseGet(() -> korisnikRepository.findByKorisnickoIme(usernameOrEmail).orElse(null));

        if (kupac == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Korisnik nije pronađen.");
        }

        if (narudzba.getKupac() == null || !kupac.getId().equals(narudzba.getKupac().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Možete ocjenjivati samo vlastite narudžbe.");
        }

        if (narudzba.getRestoran() == null) {
            return ResponseEntity.badRequest().body("Narudžba nema povezan restoran.");
        }

        RecenzijaEntity recenzija = new RecenzijaEntity();
        recenzija.setOcjena(dto.getOcjena());
        recenzija.setKomentar(dto.getKomentar());
        recenzija.setDatumKreiranja(LocalDateTime.now());
        recenzija.setKupac(kupac);
        recenzija.setRestoran(narudzba.getRestoran());
        recenzija.setNarudzba(narudzba);

        recenzijaRepository.save(recenzija);

        return ResponseEntity.status(HttpStatus.CREATED).body("Recenzija uspješno dodana.");
    }

    @GetMapping("/moja-ocjena")
    public ResponseEntity<?> getMojaOcjena(Authentication authentication) {
        String usernameOrEmail = authentication.getName();
        KorisnikEntity restoran = korisnikRepository.findByEmail(usernameOrEmail)
                .orElseGet(() -> korisnikRepository.findByKorisnickoIme(usernameOrEmail).orElse(null));

        if (restoran == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Restoran nije pronađen.");
        }

        return ResponseEntity.ok(recenzijaService.ocjenaZaRestoran(restoran.getId()));
    }

    @GetMapping("/restoran/{idRestorana}")
    public ResponseEntity<?> getRecenzijeZaRestoran(@PathVariable Long idRestorana) {
        return ResponseEntity.ok(recenzijaService.recenzijeZaRestoran(idRestorana));
    }

    @GetMapping("/restoran/{idRestorana}/ocjena")
    public ResponseEntity<?> getOcjenaZaRestoran(@PathVariable Long idRestorana) {
        return ResponseEntity.ok(recenzijaService.ocjenaZaRestoran(idRestorana));
    }

    // 4. PROVJERI DA LI JE JEDNA NARUDŽBA VEĆ OCJENJENA
    @GetMapping("/provjeri/{idNarudzbe}")
    public ResponseEntity<Boolean> jeOcjenjena(@PathVariable Long idNarudzbe) {
        boolean ocjenjena = recenzijaRepository.existsByNarudzbaId(idNarudzbe);
        return ResponseEntity.ok(ocjenjena);
    }
}