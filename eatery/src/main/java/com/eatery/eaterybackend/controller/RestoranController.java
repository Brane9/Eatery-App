package com.eatery.eaterybackend.controller;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
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
import com.eatery.eaterybackend.dto.MojeNarudzbeDTO;
import com.eatery.eaterybackend.dto.RestoranOcjenaDTO;
import com.eatery.eaterybackend.dto.RestoranStatistikaDTO;
import com.eatery.eaterybackend.entity.JeloEntity;
import com.eatery.eaterybackend.entity.KategorijaEntity;
import com.eatery.eaterybackend.entity.KlijentEntity;
import com.eatery.eaterybackend.entity.KorisnikEntity;
import com.eatery.eaterybackend.entity.NarudzbaEntity;
import com.eatery.eaterybackend.entity.StavkaNarudzbeEntity;
import com.eatery.eaterybackend.repository.JeloRepository;
import com.eatery.eaterybackend.repository.KategorijaRepository;
import com.eatery.eaterybackend.repository.KlijentRepository;
import com.eatery.eaterybackend.repository.KorisnikRepository;
import com.eatery.eaterybackend.repository.NarudzbaRepository;
import com.eatery.eaterybackend.service.RecenzijaService;
import com.eatery.eaterybackend.service.StavkaNazivResolver;

@RestController
@RequestMapping("/api/restoran")
@CrossOrigin(origins = "*")
public class RestoranController {

    private final KategorijaRepository kategorijaRepository;
    private final JeloRepository jeloRepository;
    private final KorisnikRepository korisnikRepository;
    private final NarudzbaRepository narudzbaRepository;
    private final RecenzijaService recenzijaService;
    private final StavkaNazivResolver stavkaNazivResolver;
    private final KlijentRepository klijentRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public RestoranController(KategorijaRepository kategorijaRepository,
                              JeloRepository jeloRepository,
                              KorisnikRepository korisnikRepository,
                              NarudzbaRepository narudzbaRepository,
                              RecenzijaService recenzijaService,
                              StavkaNazivResolver stavkaNazivResolver,
                              KlijentRepository klijentRepository,
                              SimpMessagingTemplate messagingTemplate) {
                                
        this.kategorijaRepository = kategorijaRepository;
        this.jeloRepository = jeloRepository;
        this.korisnikRepository = korisnikRepository;
        this.narudzbaRepository = narudzbaRepository;
        this.recenzijaService = recenzijaService;
        this.stavkaNazivResolver = stavkaNazivResolver;
        this.klijentRepository = klijentRepository;
        this.messagingTemplate = messagingTemplate;
    }

    private boolean isRestoranOvlascen(Long trazeniRestoranId, Authentication authentication) {
        
        if (authentication == null || trazeniRestoranId == null) return false;

        Object details = authentication.getDetails();
        if (details instanceof Number id) {
            return trazeniRestoranId.equals(id.longValue());
        }

        String ulogovaniUsername = authentication.getName();
        KorisnikEntity ulogovani = korisnikRepository.findByKorisnickoIme(ulogovaniUsername).orElse(null);
        
        return ulogovani != null && ulogovani.getId().equals(trazeniRestoranId);
    }

    @GetMapping("/{restoranId}/kategorije")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getKategorije(@PathVariable Long restoranId) {

        return ResponseEntity.ok(kategorijaRepository.findByRestoranId(restoranId));
    }

    @PostMapping("/{restoranId}/kategorije")
    public ResponseEntity<?> dodajKategoriju(@PathVariable Long restoranId, @RequestBody KategorijaDTO dto, Authentication authentication) {
        
        if (!isRestoranOvlascen(restoranId, authentication)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Nemate dozvolu da dodajete kategorije ovom restoranu!");
        }

        KorisnikEntity restoran = korisnikRepository.findById(restoranId)
                .orElseThrow(() -> new RuntimeException("Restoran nije pronađen"));

        KategorijaEntity kat = new KategorijaEntity();
        kat.setNaziv(dto.getNaziv());
        kat.setRestoran(restoran);

        return ResponseEntity.ok(kategorijaRepository.save(kat));
    }

    @GetMapping("/{restoranId}/jela")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getJela(@PathVariable Long restoranId) {

        return ResponseEntity.ok(jeloRepository.findByRestoranId(restoranId));
    }

    @PostMapping("/{restoranId}/jela")
    public ResponseEntity<?> dodajJelo(@PathVariable Long restoranId, @RequestBody JeloDTO dto, Authentication authentication) {
        
        if (!isRestoranOvlascen(restoranId, authentication)) {
            
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Nemate dozvolu da dodajete jela ovom restoranu!");
        }

        KorisnikEntity restoran = korisnikRepository.findById(restoranId)
                .orElseThrow(() -> new RuntimeException("Restoran nije pronađen"));

        KategorijaEntity kat = kategorijaRepository.findById(dto.getKategorijaId())
                .orElseThrow(() -> new RuntimeException("Kategorija nije pronađena"));

        JeloEntity jelo = new JeloEntity();
        jelo.setNaziv(dto.getNaziv());
        jelo.setOpis(dto.getOpis());
        jelo.setCijena(dto.getCijena());
        jelo.setKategorija(kat);
        jelo.setRestoran(restoran);

        return ResponseEntity.ok(jeloRepository.save(jelo));
    }

    @PutMapping("/{restoranId}/jela/{jeloId}")
    @Transactional
    public ResponseEntity<?> izmijeniJelo(@PathVariable Long restoranId, @PathVariable Long jeloId,
                                          @RequestBody JeloDTO dto, Authentication authentication) {

        if (!isRestoranOvlascen(restoranId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Nemate dozvolu da mijenjate jela ovog restorana!"));
        }

        JeloEntity jelo = jeloRepository.findByIdAndRestoranId(jeloId, restoranId).orElse(null);
        if (jelo == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Jelo nije pronađeno na vašem meniju."));
        }
        if (dto.getNaziv() == null || dto.getNaziv().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Naziv jela je obavezan."));
        }
        if (dto.getCijena() == null || dto.getCijena().signum() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cijena mora biti veća od nule."));
        }
        if (dto.getKategorijaId() != null) {
            KategorijaEntity kat = kategorijaRepository.findById(dto.getKategorijaId()).orElse(null);
            if (kat == null || kat.getRestoran() == null || !restoranId.equals(kat.getRestoran().getId())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Izabrana kategorija ne postoji."));
            }
            jelo.setKategorija(kat);
        }

        jelo.setNaziv(dto.getNaziv().trim());
        jelo.setOpis(dto.getOpis());
        jelo.setCijena(dto.getCijena());

        return ResponseEntity.ok(jeloRepository.save(jelo));
    }

    @DeleteMapping("/{restoranId}/jela/{jeloId}")
    public ResponseEntity<?> ukloniJelo(@PathVariable Long restoranId, @PathVariable Long jeloId,
                                        Authentication authentication) {

        if (!isRestoranOvlascen(restoranId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Nemate dozvolu da uklanjate jela ovog restorana!"));
        }

        JeloEntity jelo = jeloRepository.findByIdAndRestoranId(jeloId, restoranId).orElse(null);
        if (jelo == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Jelo nije pronađeno na vašem meniju."));
        }

        try {
            jeloRepository.delete(jelo);
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Jelo se ne može ukloniti jer je povezano s drugim podacima u bazi."));
        }

        return ResponseEntity.ok(Map.of("message", "Jelo \"" + jelo.getNaziv() + "\" je uklonjeno sa menija."));
    }

    @GetMapping("/{restoranId}/statistika")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getStatistika(@PathVariable Long restoranId, Authentication authentication) {
        
        if (!isRestoranOvlascen(restoranId, authentication)) {
            
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Nemate dozvolu za uvid u statistiku ovog restorana!");
        }

        Long prodane = narudzbaRepository.prebrojProdaneVrecicePoRestoranu(restoranId);
        Long otkazane = narudzbaRepository.prebrojOtkazaneNarudzbePoRestoranu(restoranId);
        BigDecimal kg = narudzbaRepository.kgSpaseneHranePoRestoranu(restoranId);

        RestoranOcjenaDTO ocjena = recenzijaService.ocjenaZaRestoran(restoranId);

        RestoranStatistikaDTO dto = new RestoranStatistikaDTO();
        dto.setBrojProdanihVrecica(prodane != null ? prodane : 0L);
        dto.setBrojOtkazanihNarudzbi(otkazane != null ? otkazane : 0L);
        dto.setKgSpaseneHrane(kg != null ? kg : BigDecimal.ZERO);
        dto.setProsjecnaOcjena(ocjena.getProsjecnaOcjena() != null ? ocjena.getProsjecnaOcjena() : 0.0);
        dto.setUkupanBrojOcjena(ocjena.getUkupanBrojOcjena() != null ? ocjena.getUkupanBrojOcjena() : 0L);

        return ResponseEntity.ok(dto);
    }

    @GetMapping("/{restoranId}/narudzbe")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getNarudzbeZaRestoran(@PathVariable Long restoranId, Authentication authentication) {
        
        if (!isRestoranOvlascen(restoranId, authentication)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Nemate dozvolu za pregled narudžbi ovog restorana!");
        }

        List<NarudzbaEntity> narudzbe = narudzbaRepository.findByRestoranIdWithStavke(restoranId);
        List<StavkaNarudzbeEntity> sveStavke = narudzbe.stream()
                .flatMap(n -> (n.getStavke() != null ? n.getStavke() : List.<StavkaNarudzbeEntity>of()).stream())
                .toList();
        var katalog = stavkaNazivResolver.katalogZa(sveStavke);

        List<MojeNarudzbeDTO> result = narudzbe.stream().map(n -> {

            MojeNarudzbeDTO dto = new MojeNarudzbeDTO();
            dto.setId(n.getId());
            dto.setSifra(n.getSifra());
            dto.setStatus(n.getStatus());
            dto.setUkupnaCijena(n.getUkupnaCijena());
            dto.setAdresaDostave(n.getAdresaDostave());
            dto.setVrijemeKreiranja(n.getVrijemeIDatum());
            dto.setPreuzimanjeOd(n.getPreuzimanjeOd());
            dto.setPreuzimanjeDo(n.getPreuzimanjeDo());

            List<StavkaNarudzbeEntity> stavkeEnt = n.getStavke() != null ? n.getStavke() : List.of();
            dto.setStavke(stavkeEnt.stream().map(s -> {
                MojeNarudzbeDTO.StavkaPregledDTO sd = new MojeNarudzbeDTO.StavkaPregledDTO();
                sd.setKolicina(s.getKolicina());
                sd.setCijena(s.getCijena());
                sd.setNazivJela(stavkaNazivResolver.naziv(s, katalog));
                return sd;
            }).toList());

            return dto;
        }).toList();

        return ResponseEntity.ok(result);
    }

    @PutMapping("/narudzba/{narudzbaId}/status")
    public ResponseEntity<?> promijeniStatusNarudzbe(@PathVariable Long narudzbaId, @RequestBody String noviStatus, Authentication authentication) {
        
        if (authentication == null) {
           
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Niste autentifikovani!");
        }

        NarudzbaEntity narudzba = narudzbaRepository.findById(narudzbaId)
                .orElseThrow(() -> new RuntimeException("Narudžba nije pronađena pod ID: " + narudzbaId));

        String ulogovaniUsername = authentication.getName();

        KorisnikEntity ulogovaniKorisnik = korisnikRepository.findByKorisnickoIme(ulogovaniUsername).orElse(null);

        if (ulogovaniKorisnik == null || !narudzba.getRestoran().getId().equals(ulogovaniKorisnik.getId())) {
          
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Nemate dozvolu da mijenjate status tuđe narudžbe!");
        }

        String cistiStatus = noviStatus.replace("\"", "").trim();
        narudzba.setStatus(cistiStatus);

        narudzbaRepository.save(narudzba);

        Map<String, Object> notifikacija = new HashMap<>();
        notifikacija.put("tip", "STATUS_PROMIJENJEN");
        notifikacija.put("narudzbaId", narudzba.getId());
        notifikacija.put("sifra", narudzba.getSifra());
        notifikacija.put("noviStatus", cistiStatus);

        if (narudzba.getKupac() != null) {
           
            messagingTemplate.convertAndSend("/topic/kupac/" + narudzba.getKupac().getId(), (Object) notifikacija);
        }

        return ResponseEntity.ok("Status uspešno izmenjen!");
    }

    @PutMapping("/narudzba/{narudzbaId}/preuzimanje")
    @Transactional
    public ResponseEntity<?> potvrdiPreuzimanjePinom(@PathVariable Long narudzbaId,
                                                     @RequestParam String pin,
                                                     Authentication authentication) {

        if (authentication == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Niste autentifikovani!");
        }

        NarudzbaEntity narudzba = narudzbaRepository.findById(narudzbaId)
                .orElseThrow(() -> new RuntimeException("Narudžba nije pronađena pod ID: " + narudzbaId));

        String ulogovaniUsername = authentication.getName();
        KorisnikEntity ulogovaniKorisnik = korisnikRepository.findByKorisnickoIme(ulogovaniUsername).orElse(null);

        if (ulogovaniKorisnik == null || !narudzba.getRestoran().getId().equals(ulogovaniKorisnik.getId())) {
            
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Nemate dozvolu da potvrđujete preuzimanje tuđe narudžbe!");
        }

        String uneseniPin = pin == null ? "" : pin.trim();

        if (narudzba.getPin() == null || !narudzba.getPin().equals(uneseniPin)) {

            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Neispravan PIN! Zatražite ga ponovo od kupca."));
        }

        narudzba.setStatus("PREUZETO");
        narudzbaRepository.save(narudzba);

        return ResponseEntity.ok(Map.of("message", "Preuzimanje potvrđeno! Narudžba je označena kao preuzeta."));
    }

    @GetMapping("/{restoranId}/profil")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getProfilRestorana(@PathVariable Long restoranId, Authentication authentication) {
        
        if (!isRestoranOvlascen(restoranId, authentication)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Nemate dozvolu za uvid u profil ovog restorana!");
        }

        return klijentRepository.findById(restoranId)
                .map(klijent -> {

                    Map<String, Object> response = new HashMap<>();
                    response.put("id", klijent.getId());
                    response.put("nazivObjekta", klijent.getNazivObjekta());
                    response.put("adresa", klijent.getAdresa());
                    response.put("lat", klijent.getLat());
                    response.put("lng", klijent.getLng());
                    response.put("radnoVrijemeOd", klijent.getRadnoVrijemeOd());
                    response.put("radnoVrijemeDo", klijent.getRadnoVrijemeDo());

                    return ResponseEntity.ok((Object) response);
                })
                .orElseGet(() -> ResponseEntity.badRequest().body((Object) "Restoran nije pronađen!"));
    }

    @PutMapping("/{restoranId}/profil")
    @Transactional
    public ResponseEntity<?> azurirajProfilRestorana(@PathVariable Long restoranId,
                                                     @RequestBody Map<String, Object> body,
                                                     Authentication authentication) {

        if (!isRestoranOvlascen(restoranId, authentication)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Nemate dozvolu za izmjenu profila ovog restorana!");
        }

        return klijentRepository.findById(restoranId)
                .map(klijent -> {

                    if (body.containsKey("nazivObjekta") && body.get("nazivObjekta") != null) {
                        String noviNaziv = body.get("nazivObjekta").toString().trim();

                        if (!noviNaziv.isEmpty()) {

                            klijent.setNazivObjekta(noviNaziv);
                        }
                    }

                    if (body.containsKey("adresa") && body.get("adresa") != null) {

                        klijent.setAdresa(body.get("adresa").toString().trim());
                    }
                    if (body.containsKey("lat") && body.get("lat") != null) {

                        klijent.setLat(((Number) body.get("lat")).doubleValue());
                    }
                    if (body.containsKey("lng") && body.get("lng") != null) {

                        klijent.setLng(((Number) body.get("lng")).doubleValue());
                    }
                    if (body.containsKey("radnoVrijemeOd")) {

                        Object v = body.get("radnoVrijemeOd");

                        String s = v != null ? v.toString().trim() : "";

                        klijent.setRadnoVrijemeOd(s.isEmpty() ? null : s);
                    }
                    if (body.containsKey("radnoVrijemeDo")) {

                        Object v = body.get("radnoVrijemeDo");

                        String s = v != null ? v.toString().trim() : "";

                        klijent.setRadnoVrijemeDo(s.isEmpty() ? null : s);
                    }

                    KlijentEntity sacuvani = klijentRepository.save(klijent);

                    Map<String, Object> response = new HashMap<>();
                    response.put("id", sacuvani.getId());
                    response.put("nazivObjekta", sacuvani.getNazivObjekta());
                    response.put("adresa", sacuvani.getAdresa());
                    response.put("lat", sacuvani.getLat());
                    response.put("lng", sacuvani.getLng());
                    response.put("radnoVrijemeOd", sacuvani.getRadnoVrijemeOd());
                    response.put("radnoVrijemeDo", sacuvani.getRadnoVrijemeDo());

                    return ResponseEntity.ok((Object) response);
                })
                .orElseGet(() -> ResponseEntity.badRequest().body((Object) "Restoran nije pronađen!"));
    }

    @PutMapping("/{restoranId}/naziv")
    @Transactional
    public ResponseEntity<?> promijeniNazivObjekta(@PathVariable Long restoranId,
                                                   @RequestBody String noviNaziv,
                                                   Authentication authentication) {

        if (!isRestoranOvlascen(restoranId, authentication)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Nemate dozvolu za izmjenu naziva ovog restorana!");
        }

        String cistiNaziv = noviNaziv.replace("\"", "").trim();

        if (cistiNaziv.isEmpty()) {

            return ResponseEntity.badRequest().body("Naziv objekta ne može biti prazan!");
        }

        Optional<KlijentEntity> klijentOpt = klijentRepository.findById(restoranId);

        if (klijentOpt.isEmpty()) {

            return ResponseEntity.badRequest().body("Klijent nije pronađen!");
        }

        KlijentEntity klijent = klijentOpt.get();
        klijent.setNazivObjekta(cistiNaziv);
        klijentRepository.save(klijent);

        return ResponseEntity.ok("Naziv uspješno promijenjen u: " + cistiNaziv);
    }
}
