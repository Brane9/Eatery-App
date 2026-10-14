package com.eatery.eaterybackend.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
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
import com.eatery.eaterybackend.entity.KlijentEntity;
import com.eatery.eaterybackend.entity.KorisnikEntity;
import com.eatery.eaterybackend.entity.NarudzbaEntity;
import com.eatery.eaterybackend.entity.StavkaNarudzbeEntity;
import com.eatery.eaterybackend.entity.VrecicaIznenadjenjaEntity;
import com.eatery.eaterybackend.repository.KlijentRepository;
import com.eatery.eaterybackend.repository.KorisnikRepository;
import com.eatery.eaterybackend.repository.NarudzbaRepository;
import com.eatery.eaterybackend.repository.StavkaNarudzbeRepository;
import com.eatery.eaterybackend.repository.VrecicaIznenadjenjaRepository;
import com.eatery.eaterybackend.service.PreuzimanjeVreciceService;
import com.eatery.eaterybackend.service.RadnoVrijemeService;
import com.eatery.eaterybackend.service.StavkaNazivResolver;

@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@RestController
@RequestMapping("/api/narudzbe")
public class NarudzbaController {

    private final NarudzbaRepository narudzbaRepository;
    private final KorisnikRepository korisnikRepository;
    private final StavkaNarudzbeRepository stavkaNarudzbeRepository;
    private final VrecicaIznenadjenjaRepository vrecicaIznenadjenjaRepository;
    private final KlijentRepository klijentRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final StavkaNazivResolver stavkaNazivResolver;
    private final RadnoVrijemeService radnoVrijemeService;
    private final PreuzimanjeVreciceService preuzimanjeVreciceService;

    public NarudzbaController(NarudzbaRepository narudzbaRepository,
                              KorisnikRepository korisnikRepository,
                              StavkaNarudzbeRepository stavkaNarudzbeRepository,
                              VrecicaIznenadjenjaRepository vrecicaIznenadjenjaRepository,
                              KlijentRepository klijentRepository,
                              SimpMessagingTemplate messagingTemplate,
                              StavkaNazivResolver stavkaNazivResolver,
                              RadnoVrijemeService radnoVrijemeService,
                              PreuzimanjeVreciceService preuzimanjeVreciceService) {
                                
        this.narudzbaRepository = narudzbaRepository;
        this.korisnikRepository = korisnikRepository;
        this.stavkaNarudzbeRepository = stavkaNarudzbeRepository;
        this.vrecicaIznenadjenjaRepository = vrecicaIznenadjenjaRepository;
        this.klijentRepository = klijentRepository;
        this.messagingTemplate = messagingTemplate;
        this.stavkaNazivResolver = stavkaNazivResolver;
        this.radnoVrijemeService = radnoVrijemeService;
        this.preuzimanjeVreciceService = preuzimanjeVreciceService;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> kreirajNarudzbu(@RequestBody NarudzbaDTO dto, Authentication authentication) {
        
        if (authentication == null) {
        
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Niste autentifikovani!");
        }

        String ulogovaniUsername = authentication.getName();
        KorisnikEntity ulogovaniKupac = korisnikRepository.findByKorisnickoIme(ulogovaniUsername)
                .orElseThrow(() -> new RuntimeException("Ulogovani korisnik nije pronađen!"));

        KorisnikEntity restoran = korisnikRepository.findById(dto.getRestoranId())
                .orElseThrow(() -> new RuntimeException("Restoran nije pronađen sa ID: " + dto.getRestoranId()));

        KlijentEntity klijentRestorana = klijentRepository.findById(dto.getRestoranId()).orElse(null);

        if (!radnoVrijemeService.jeOtvoren(klijentRestorana)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", radnoVrijemeService.porukaZatvoren(klijentRestorana)));
        }

        // Termin preuzimanja vrećica iznenađenja (satnicu definiše restoran na vrećici)
        List<VrecicaIznenadjenjaEntity> vreciceUNarudzbi = new ArrayList<>();
        if (dto.getStavke() != null) {
            for (NarudzbaDTO.StavkaDTO sDTO : dto.getStavke()) {
                if ("VRECICA".equalsIgnoreCase(sDTO.getTipStavke()) && sDTO.getJeloId() != null) {
                    VrecicaIznenadjenjaEntity v = vrecicaIznenadjenjaRepository.findById(sDTO.getJeloId()).orElse(null);
                    if (v == null || Boolean.TRUE.equals(v.getObrisana()) || !Boolean.TRUE.equals(v.getAktivna())) {
                        String naziv = v != null ? "\"" + v.getNaziv() + "\" " : "";
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(Map.of("message", "Vrećica " + naziv + "više nije dostupna. Uklonite je iz korpe."));
                    }
                    vreciceUNarudzbi.add(v);
                }
            }
        }

        LocalDateTime sada = preuzimanjeVreciceService.sada();
        PreuzimanjeVreciceService.RezultatTermina rezultatTermina =
                preuzimanjeVreciceService.izracunajTermin(vreciceUNarudzbi, sada);

        if (rezultatTermina.greska() != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", rezultatTermina.greska()));
        }

        NarudzbaEntity narudzba = new NarudzbaEntity();
        narudzba.setKupac(ulogovaniKupac);
        narudzba.setRestoran(restoran);
        narudzba.setAdresaDostave(dto.getAdresaDostave());
        narudzba.setUkupnaCijena(dto.getUkupnaCijena());
        narudzba.setStatus("KREIRANA");
        narudzba.setSifra("ORD-" + System.currentTimeMillis());

        PreuzimanjeVreciceService.Termin termin = rezultatTermina.termin();
        if (termin != null) {
            narudzba.setPreuzimanjeOd(termin.od());
            narudzba.setPreuzimanjeDo(termin.doVrijeme());
            narudzba.setObavijestPreuzimanjaPoslana(termin.jeAktivan(sada));
        }

        NarudzbaEntity sacuvana = narudzbaRepository.save(narudzba);

        if (dto.getStavke() != null && !dto.getStavke().isEmpty()) {

            for (NarudzbaDTO.StavkaDTO sDTO : dto.getStavke()) {

                if ("VRECICA".equalsIgnoreCase(sDTO.getTipStavke())) {
                    
                    VrecicaIznenadjenjaEntity vrecica = vrecicaIznenadjenjaRepository.findById(sDTO.getJeloId())
                            .orElseThrow(() -> new RuntimeException("Vrećica nije pronađena"));

                    if (vrecica.getKolicina() < sDTO.getKolicina()) {

                        throw new RuntimeException("Nema dovoljno vrećica na stanju!");
                    }

                    vrecica.setKolicina(vrecica.getKolicina() - sDTO.getKolicina());
                    vrecicaIznenadjenjaRepository.save(vrecica);
                }

                StavkaNarudzbeEntity stavka = new StavkaNarudzbeEntity();
                stavka.setIdNarudzbe(sacuvana.getId());
                stavka.setIdJela(sDTO.getJeloId());
                stavka.setTipStavke(sDTO.getTipStavke());
                stavka.setKolicina(sDTO.getKolicina());
                stavka.setCijena(sDTO.getCijena());
                stavka.setNaziv(stavkaNazivResolver.nazivZaNovuStavku(sDTO.getTipStavke(), sDTO.getJeloId(), null));
                stavkaNarudzbeRepository.save(stavka);
            }
        }

        Map<String, Object> notifikacija = new HashMap<>();
        notifikacija.put("tip", "NOVA_NARUDZBA");
        notifikacija.put("narudzbaId", sacuvana.getId());
        notifikacija.put("sifra", sacuvana.getSifra());
        notifikacija.put("ukupnaCijena", sacuvana.getUkupnaCijena());
        notifikacija.put("adresaDostave", sacuvana.getAdresaDostave());
        messagingTemplate.convertAndSend("/topic/restoran/" + dto.getRestoranId(), (Object) notifikacija);

        return ResponseEntity.ok(sacuvana);
    }

    @GetMapping("/restoran/{restoranId}")
    public ResponseEntity<?> getNarudzbeZaRestoran(@PathVariable("restoranId") Long restoranId, Authentication authentication) {
        
        if (authentication == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Niste autentifikovani!");
        }

        String ulogovaniUsername = authentication.getName();

        KorisnikEntity ulogovaniKorisnik = korisnikRepository.findByKorisnickoIme(ulogovaniUsername).orElse(null);

        if (ulogovaniKorisnik == null || !ulogovaniKorisnik.getId().equals(restoranId)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Nemate dozvolu da gledate narudžbe drugog restorana!");
        }

        return ResponseEntity.ok(narudzbaRepository.findByRestoranId(restoranId));
    }

    @GetMapping("/kupac/{kupacId}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getNarudzbeZaKupca(@PathVariable("kupacId") Long kupacId, Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Niste autentifikovani!");
        }

        String ulogovaniUsername = authentication.getName();
        KorisnikEntity ulogovaniKorisnik = korisnikRepository.findByKorisnickoIme(ulogovaniUsername).orElse(null);

        if (ulogovaniKorisnik == null || !ulogovaniKorisnik.getId().equals(kupacId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Nemate dozvolu da gledate narudžbe drugog kupca!");
        }

        List<NarudzbaEntity> narudzbe = narudzbaRepository.findByKupacIdWithStavke(kupacId);
        List<StavkaNarudzbeEntity> sveStavke = narudzbe.stream()
                .flatMap(n -> (n.getStavke() != null ? n.getStavke() : List.<StavkaNarudzbeEntity>of()).stream())
                .toList();
        var katalog = stavkaNazivResolver.katalogZa(sveStavke);

        List<NarudzbaDTO> dtos = narudzbe.stream().map(n -> {
            NarudzbaDTO dto = new NarudzbaDTO();
            dto.setId(n.getId());
            dto.setKupacId(n.getKupac() != null ? n.getKupac().getId() : null);

            if (n.getRestoran() != null) {
                dto.setRestoranId(n.getRestoran().getId());
                dto.setRestoranNaziv(n.getRestoran().getKorisnickoIme());
                klijentRepository.findById(n.getRestoran().getId())
                        .map(KlijentEntity::getNazivObjekta)
                        .filter(naziv -> naziv != null && !naziv.isBlank())
                        .ifPresent(dto::setRestoranNaziv);
            }

            dto.setSifra(n.getSifra());
            dto.setAdresaDostave(n.getAdresaDostave());
            dto.setStatus(n.getStatus());
            dto.setUkupnaCijena(n.getUkupnaCijena());
            dto.setPreuzimanjeOd(n.getPreuzimanjeOd());
            dto.setPreuzimanjeDo(n.getPreuzimanjeDo());

            List<StavkaNarudzbeEntity> stavkeEnt = n.getStavke() != null ? n.getStavke() : List.of();
            dto.setStavke(stavkeEnt.stream().map(s -> {
                NarudzbaDTO.StavkaDTO sd = new NarudzbaDTO.StavkaDTO();
                sd.setJeloId(s.getIdJela());
                sd.setTipStavke(s.getTipStavke());
                sd.setKolicina(s.getKolicina());
                sd.setCijena(s.getCijena());
                sd.setNaziv(stavkaNazivResolver.naziv(s, katalog));
                return sd;
            }).toList());
            return dto;
        }).toList();

        return ResponseEntity.ok(dtos);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> promjeniStatus(
            @PathVariable("id") Long id,
            @RequestParam("status") String status,
            Authentication authentication) {

        try {

            if (authentication == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Niste autentifikovani!");
            }

            NarudzbaEntity narudzba = narudzbaRepository.findById(id).orElse(null);

            if (narudzba == null) {
                return ResponseEntity.badRequest().body("Narudžba sa ID " + id + " nije pronađena!");
            }

            String ulogovaniUsername = authentication.getName();
            KorisnikEntity ulogovaniKorisnik = korisnikRepository.findByKorisnickoIme(ulogovaniUsername).orElse(null);

            if (ulogovaniKorisnik == null || !narudzba.getRestoran().getId().equals(ulogovaniKorisnik.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Nemate dozvolu da menjate status narudžbe koja ne pripada vašem restoranu!");
            }

            // --- VALIDACIJA TRANSICIONALNIH STATUSA ---
            String trenutniStatus = narudzba.getStatus() != null ? narudzba.getStatus().toUpperCase() : "";
            String noviStatus = status != null ? status.toUpperCase() : "";

            // 1. Ako je već zavrešeno (DOSTAVLJENO ili OTKAZANO/OTKAZANA), onemogući izmjene
            // Ako je narudžba završena ili otkazana, onemogući izmjene
            if ("DOSTAVLJENO".equals(trenutniStatus) || "PREUZETO".equals(trenutniStatus) || "OTKAZANO".equals(trenutniStatus) || "OTKAZANA".equals(trenutniStatus)) {
                return ResponseEntity.badRequest().body("Status zavrešene narudžbe se više ne može mijenjati!");
            }

            // 2. Ako je SPREMNO, ne može se vratiti u U_PRIPREMI
            if ("SPREMNO".equals(trenutniStatus) && "U_PRIPREMI".equals(noviStatus)) {
                return ResponseEntity.badRequest().body("Narudžba koja je označena kao SPREMNO ne može se vratiti u pripremu!");
            }
            // ------------------------------------------

            if (narudzba.getSifra() == null || narudzba.getSifra().isEmpty()) {
                narudzba.setSifra("ORD-" + System.currentTimeMillis());
            }

            narudzba.setStatus(noviStatus);
            narudzbaRepository.save(narudzba);

            return ResponseEntity.ok("Status uspešno promenjen u: " + noviStatus);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Greška pri izmeni statusa: " + e.getMessage());
        }
    }
}
