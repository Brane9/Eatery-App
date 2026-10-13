package com.eatery.eaterybackend.controller;

import com.eatery.eaterybackend.dto.VrecicaIznenadjenjaDTO;
import com.eatery.eaterybackend.entity.KorisnikEntity;
import com.eatery.eaterybackend.entity.VrecicaIznenadjenjaEntity;
import com.eatery.eaterybackend.repository.KorisnikRepository;
import com.eatery.eaterybackend.repository.VrecicaIznenadjenjaRepository;
import com.eatery.eaterybackend.service.PreuzimanjeVreciceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vrecice")
@CrossOrigin(origins = "*")
public class VrecicaIznenadjenjaController {

    private final VrecicaIznenadjenjaRepository vrecicaRepository;
    private final KorisnikRepository korisnikRepository;
    private final PreuzimanjeVreciceService preuzimanjeVreciceService;

    public VrecicaIznenadjenjaController(VrecicaIznenadjenjaRepository vrecicaRepository,
                                         KorisnikRepository korisnikRepository,
                                         PreuzimanjeVreciceService preuzimanjeVreciceService) {
        this.vrecicaRepository = vrecicaRepository;
        this.korisnikRepository = korisnikRepository;
        this.preuzimanjeVreciceService = preuzimanjeVreciceService;
    }

    // Pomoćna metoda za provjeru autorizacije restorana
    private boolean isRestoranOvlascen(Long trazeniRestoranId, Authentication authentication) {
        if (authentication == null) return false;
        String ulogovaniUsername = authentication.getName();
        KorisnikEntity ulogovani = korisnikRepository.findByKorisnickoIme(ulogovaniUsername).orElse(null);
        return ulogovani != null && ulogovani.getId().equals(trazeniRestoranId);
    }

    // 1. DOHVAT SVIH AKTIVNIH VREĆICA (Javna ruta za ulogovane kupce)
    @GetMapping("/aktivne")
    public ResponseEntity<List<VrecicaIznenadjenjaEntity>> getAktivneVrecice() {
        return ResponseEntity.ok(vrecicaRepository.findByAktivnaTrueAndKolicinaGreaterThan(0));
    }

    // 2. DOHVAT VREĆICA ZA ODREĐENI RESTORAN
    @GetMapping("/restoran/{restoranId}")
    public ResponseEntity<?> getVreciceZaRestoran(@PathVariable Long restoranId, Authentication authentication) {
        if (!isRestoranOvlascen(restoranId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Nemate dozvolu za uvid u vrećice ovog restorana!");
        }
        return ResponseEntity.ok(vrecicaRepository.findVidljiveByRestoranId(restoranId));
    }

    // 3. KREIRANJE NOVE VREĆICE IZNENAĐENJA
    @PostMapping("/restoran/{restoranId}")
    public ResponseEntity<?> dodajVrecicu(@PathVariable Long restoranId,
                                          @RequestBody VrecicaIznenadjenjaDTO dto,
                                          Authentication authentication) {
        if (!isRestoranOvlascen(restoranId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Nemate dozvolu da objavljujete vrećice u ime ovog restorana!");
        }

        // Restoran mora definisati satnicu preuzimanja (npr. 18:00 – 19:30)
        String greskaSatnice = preuzimanjeVreciceService.validirajSatnicu(
                dto.getVrijemePreuzimanjaOd(), dto.getVrijemePreuzimanjaDo());
        if (greskaSatnice != null) {
            return ResponseEntity.badRequest().body(Map.of("message", greskaSatnice));
        }

        KorisnikEntity restoran = korisnikRepository.findById(restoranId)
                .orElseThrow(() -> new RuntimeException("Restoran nije pronađen"));

        VrecicaIznenadjenjaEntity vrecica = new VrecicaIznenadjenjaEntity();
        vrecica.setRestoran(restoran);
        primijeniPodatke(vrecica, dto);

        return ResponseEntity.ok(vrecicaRepository.save(vrecica));
    }

    // IZMJENA OBJAVLJENE VREĆICE
    @PutMapping("/{vrecicaId}")
    public ResponseEntity<?> izmijeniVrecicu(@PathVariable Long vrecicaId,
                                             @RequestBody VrecicaIznenadjenjaDTO dto,
                                             Authentication authentication) {
        VrecicaIznenadjenjaEntity vrecica = vlastitaVrecica(vrecicaId, authentication);
        if (vrecica == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Vrećica nije pronađena među vašim vrećicama."));
        }

        String greskaSatnice = preuzimanjeVreciceService.validirajSatnicu(
                dto.getVrijemePreuzimanjaOd(), dto.getVrijemePreuzimanjaDo());
        if (greskaSatnice != null) {
            return ResponseEntity.badRequest().body(Map.of("message", greskaSatnice));
        }
        if (dto.getNaziv() == null || dto.getNaziv().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Naziv vrećice je obavezan."));
        }
        if (dto.getKolicina() == null || dto.getKolicina() < 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Količina ne može biti negativna."));
        }

        primijeniPodatke(vrecica, dto);
        return ResponseEntity.ok(vrecicaRepository.save(vrecica));
    }

    // UKLANJANJE VREĆICE IZ PONUDE
    @DeleteMapping("/{vrecicaId}")
    public ResponseEntity<?> ukloniVrecicu(@PathVariable Long vrecicaId, Authentication authentication) {
        VrecicaIznenadjenjaEntity vrecica = vlastitaVrecica(vrecicaId, authentication);
        if (vrecica == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Vrećica nije pronađena među vašim vrećicama."));
        }

        vrecica.setObrisana(true);
        vrecica.setAktivna(false);
        vrecicaRepository.save(vrecica);

        return ResponseEntity.ok(Map.of("message", "Vrećica \"" + vrecica.getNaziv() + "\" je uklonjena iz ponude."));
    }

    private VrecicaIznenadjenjaEntity vlastitaVrecica(Long vrecicaId, Authentication authentication) {
        if (authentication == null) {
            return null;
        }
        VrecicaIznenadjenjaEntity vrecica = vrecicaRepository.findById(vrecicaId).orElse(null);
        if (vrecica == null || Boolean.TRUE.equals(vrecica.getObrisana()) || vrecica.getRestoran() == null) {
            return null;
        }
        return isRestoranOvlascen(vrecica.getRestoran().getId(), authentication) ? vrecica : null;
    }

    private void primijeniPodatke(VrecicaIznenadjenjaEntity vrecica, VrecicaIznenadjenjaDTO dto) {
        vrecica.setNaziv(dto.getNaziv() != null ? dto.getNaziv().trim() : null);
        vrecica.setOpis(dto.getOpis());
        vrecica.setOriginalnaCijena(dto.getOriginalnaCijena());
        vrecica.setAkcijskaCijena(dto.getAkcijskaCijena());
        vrecica.setKolicina(dto.getKolicina());
        vrecica.setTezinaKg(
                dto.getTezinaKg() != null && dto.getTezinaKg().signum() > 0
                        ? dto.getTezinaKg()
                        : java.math.BigDecimal.ONE
        );
        vrecica.setVrijemePreuzimanjaOd(preuzimanjeVreciceService.normalizuj(dto.getVrijemePreuzimanjaOd()));
        vrecica.setVrijemePreuzimanjaDo(preuzimanjeVreciceService.normalizuj(dto.getVrijemePreuzimanjaDo()));
        if (dto.getAktivna() != null) {
            vrecica.setAktivna(dto.getAktivna());
        } else if (vrecica.getAktivna() == null) {
            vrecica.setAktivna(true);
        }
        vrecica.setAlergijskaUpozorenja(
                dto.getAlergijskaUpozorenja() != null && !dto.getAlergijskaUpozorenja().isBlank()
                        ? dto.getAlergijskaUpozorenja().trim()
                        : null
        );
    }

    // 4. BRZA PROMJENA STATUSA
    @PutMapping("/{vrecicaId}/status")
    public ResponseEntity<?> promijeniStatus(@PathVariable Long vrecicaId,
                                             @RequestParam Boolean aktivna,
                                             Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Niste autentifikovani!");
        }

        VrecicaIznenadjenjaEntity vrecica = vrecicaRepository.findById(vrecicaId)
                .orElseThrow(() -> new RuntimeException("Vrećica nije pronađena"));

        // Provjera da li ulogovani restoran posjeduje traženu vrećicu
        String ulogovaniUsername = authentication.getName();
        KorisnikEntity ulogovani = korisnikRepository.findByKorisnickoIme(ulogovaniUsername).orElse(null);

        if (ulogovani == null || !vrecica.getRestoran().getId().equals(ulogovani.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Nemate dozvolu da mijenjate status tuđe vrećice!");
        }

        vrecica.setAktivna(aktivna);
        vrecicaRepository.save(vrecica);

        return ResponseEntity.ok("Status vrećice uspešno promenjen!");
    }

    // 5. BRZO AŽURIRANJE KOLIČINE
    @PutMapping("/{vrecicaId}/kolicina")
    public ResponseEntity<?> azurirajKolicinu(@PathVariable Long vrecicaId,
                                              @RequestParam Integer kolicina,
                                              Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Niste autentifikovani!");
        }

        VrecicaIznenadjenjaEntity vrecica = vrecicaRepository.findById(vrecicaId)
                .orElseThrow(() -> new RuntimeException("Vrećica nije pronađena"));

        // Provjera da li ulogovani restoran posjeduje traženu vrećicu
        String ulogovaniUsername = authentication.getName();
        KorisnikEntity ulogovani = korisnikRepository.findByKorisnickoIme(ulogovaniUsername).orElse(null);

        if (ulogovani == null || !vrecica.getRestoran().getId().equals(ulogovani.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Nemate dozvolu da mijenjate količinu tuđe vrećice!");
        }

        vrecica.setKolicina(kolicina);
        vrecicaRepository.save(vrecica);

        return ResponseEntity.ok("Količina vrećice uspešno ažurirana!");
    }
}