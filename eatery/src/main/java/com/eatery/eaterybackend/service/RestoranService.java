package com.eatery.eaterybackend.service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
import com.eatery.eaterybackend.exception.ApiException;
import com.eatery.eaterybackend.repository.JeloRepository;
import com.eatery.eaterybackend.repository.KategorijaRepository;
import com.eatery.eaterybackend.repository.KlijentRepository;
import com.eatery.eaterybackend.repository.KorisnikRepository;
import com.eatery.eaterybackend.repository.NarudzbaRepository;

@Service
public class RestoranService {

    private final KategorijaRepository kategorijaRepository;
    private final JeloRepository jeloRepository;
    private final KorisnikRepository korisnikRepository;
    private final NarudzbaRepository narudzbaRepository;
    private final RecenzijaService recenzijaService;
    private final StavkaNazivResolver stavkaNazivResolver;
    private final KlijentRepository klijentRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final KorisnikPristupService korisnikPristupService;

    public RestoranService(KategorijaRepository kategorijaRepository,
                           JeloRepository jeloRepository,
                           KorisnikRepository korisnikRepository,
                           NarudzbaRepository narudzbaRepository,
                           RecenzijaService recenzijaService,
                           StavkaNazivResolver stavkaNazivResolver,
                           KlijentRepository klijentRepository,
                           SimpMessagingTemplate messagingTemplate,
                           KorisnikPristupService korisnikPristupService) {
        this.kategorijaRepository = kategorijaRepository;
        this.jeloRepository = jeloRepository;
        this.korisnikRepository = korisnikRepository;
        this.narudzbaRepository = narudzbaRepository;
        this.recenzijaService = recenzijaService;
        this.stavkaNazivResolver = stavkaNazivResolver;
        this.klijentRepository = klijentRepository;
        this.messagingTemplate = messagingTemplate;
        this.korisnikPristupService = korisnikPristupService;
    }

    @Transactional(readOnly = true)
    public List<KategorijaEntity> getKategorije(Long restoranId) {
        return kategorijaRepository.findByRestoranId(restoranId);
    }

    @Transactional
    public KategorijaEntity dodajKategoriju(Long restoranId, KategorijaDTO dto, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(restoranId, authentication,
                "Nemate dozvolu da dodajete kategorije ovom restoranu!");
        KorisnikEntity restoran = korisnikRepository.findById(restoranId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Restoran nije pronađen"));
        KategorijaEntity kat = new KategorijaEntity();
        kat.setNaziv(dto.getNaziv());
        kat.setRestoran(restoran);
        return kategorijaRepository.save(kat);
    }

    @Transactional(readOnly = true)
    public List<JeloEntity> getJela(Long restoranId) {
        return jeloRepository.findByRestoranId(restoranId);
    }

    @Transactional
    public JeloEntity dodajJelo(Long restoranId, JeloDTO dto, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(restoranId, authentication,
                "Nemate dozvolu da dodajete jela ovom restoranu!");
        KorisnikEntity restoran = korisnikRepository.findById(restoranId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Restoran nije pronađen"));
        KategorijaEntity kat = kategorijaRepository.findById(dto.getKategorijaId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Kategorija nije pronađena"));
        JeloEntity jelo = new JeloEntity();
        jelo.setNaziv(dto.getNaziv());
        jelo.setOpis(dto.getOpis());
        jelo.setCijena(dto.getCijena());
        jelo.setKategorija(kat);
        jelo.setRestoran(restoran);
        return jeloRepository.save(jelo);
    }

    @Transactional
    public JeloEntity izmijeniJelo(Long restoranId, Long jeloId, JeloDTO dto, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(restoranId, authentication,
                "Nemate dozvolu da mijenjate jela ovog restorana!");
        JeloEntity jelo = jeloRepository.findByIdAndRestoranId(jeloId, restoranId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Jelo nije pronađeno na vašem meniju."));
        if (dto.getNaziv() == null || dto.getNaziv().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Naziv jela je obavezan.");
        }
        if (dto.getCijena() == null || dto.getCijena().signum() <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cijena mora biti veća od nule.");
        }
        if (dto.getKategorijaId() != null) {
            KategorijaEntity kat = kategorijaRepository.findById(dto.getKategorijaId()).orElse(null);
            if (kat == null || kat.getRestoran() == null || !restoranId.equals(kat.getRestoran().getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Izabrana kategorija ne postoji.");
            }
            jelo.setKategorija(kat);
        }
        jelo.setNaziv(dto.getNaziv().trim());
        jelo.setOpis(dto.getOpis());
        jelo.setCijena(dto.getCijena());
        return jeloRepository.save(jelo);
    }

    @Transactional
    public Map<String, String> ukloniJelo(Long restoranId, Long jeloId, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(restoranId, authentication,
                "Nemate dozvolu da uklanjate jela ovog restorana!");
        JeloEntity jelo = jeloRepository.findByIdAndRestoranId(jeloId, restoranId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Jelo nije pronađeno na vašem meniju."));
        try {
            jeloRepository.delete(jelo);
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Jelo se ne može ukloniti jer je povezano s drugim podacima u bazi.");
        }
        return Map.of("message", "Jelo \"" + jelo.getNaziv() + "\" je uklonjeno sa menija.");
    }

    @Transactional(readOnly = true)
    public RestoranStatistikaDTO getStatistika(Long restoranId, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(restoranId, authentication,
                "Nemate dozvolu za uvid u statistiku ovog restorana!");
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
        return dto;
    }

    @Transactional(readOnly = true)
    public List<MojeNarudzbeDTO> getNarudzbe(Long restoranId, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(restoranId, authentication,
                "Nemate dozvolu za pregled narudžbi ovog restorana!");
        List<NarudzbaEntity> narudzbe = narudzbaRepository.findByRestoranIdWithStavke(restoranId);
        List<StavkaNarudzbeEntity> sveStavke = narudzbe.stream()
                .flatMap(n -> (n.getStavke() != null ? n.getStavke() : List.<StavkaNarudzbeEntity>of()).stream())
                .toList();
        var katalog = stavkaNazivResolver.katalogZa(sveStavke);

        return narudzbe.stream().map(n -> {
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
    }

    @Transactional
    public String promijeniStatusNarudzbe(Long narudzbaId, String noviStatus, Authentication authentication) {
        KorisnikEntity ulogovani = korisnikPristupService.zahtijevajUlogovanog(authentication);
        NarudzbaEntity narudzba = narudzbaRepository.findById(narudzbaId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Narudžba nije pronađena pod ID: " + narudzbaId));
        if (narudzba.getRestoran() == null || !narudzba.getRestoran().getId().equals(ulogovani.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Nemate dozvolu da mijenjate status tuđe narudžbe!");
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
        return "Status uspešno izmenjen!";
    }

    @Transactional
    public Map<String, String> potvrdiPreuzimanjePinom(Long narudzbaId, String pin, Authentication authentication) {
        KorisnikEntity ulogovani = korisnikPristupService.zahtijevajUlogovanog(authentication);
        NarudzbaEntity narudzba = narudzbaRepository.findById(narudzbaId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Narudžba nije pronađena pod ID: " + narudzbaId));
        if (narudzba.getRestoran() == null || !narudzba.getRestoran().getId().equals(ulogovani.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Nemate dozvolu da potvrđujete preuzimanje tuđe narudžbe!");
        }
        String uneseniPin = pin == null ? "" : pin.trim();
        if (narudzba.getPin() == null || !narudzba.getPin().equals(uneseniPin)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Neispravan PIN! Zatražite ga ponovo od kupca.");
        }
        narudzba.setStatus("PREUZETO");
        narudzbaRepository.save(narudzba);
        return Map.of("message", "Preuzimanje potvrđeno! Narudžba je označena kao preuzeta.");
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getProfil(Long restoranId, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(restoranId, authentication,
                "Nemate dozvolu za uvid u profil ovog restorana!");
        KlijentEntity klijent = klijentRepository.findById(restoranId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Restoran nije pronađen!"));
        return profilMap(klijent);
    }

    @Transactional
    public Map<String, Object> azurirajProfil(Long restoranId, Map<String, Object> body, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(restoranId, authentication,
                "Nemate dozvolu za izmjenu profila ovog restorana!");
        KlijentEntity klijent = klijentRepository.findById(restoranId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Restoran nije pronađen!"));

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
        return profilMap(klijentRepository.save(klijent));
    }

    @Transactional
    public String promijeniNazivObjekta(Long restoranId, String noviNaziv, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(restoranId, authentication,
                "Nemate dozvolu za izmjenu naziva ovog restorana!");
        String cistiNaziv = noviNaziv.replace("\"", "").trim();
        if (cistiNaziv.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Naziv objekta ne može biti prazan!");
        }
        KlijentEntity klijent = klijentRepository.findById(restoranId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Klijent nije pronađen!"));
        klijent.setNazivObjekta(cistiNaziv);
        klijentRepository.save(klijent);
        return "Naziv uspješno promijenjen u: " + cistiNaziv;
    }

    private Map<String, Object> profilMap(KlijentEntity klijent) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", klijent.getId());
        response.put("nazivObjekta", klijent.getNazivObjekta());
        response.put("adresa", klijent.getAdresa());
        response.put("lat", klijent.getLat());
        response.put("lng", klijent.getLng());
        response.put("radnoVrijemeOd", klijent.getRadnoVrijemeOd());
        response.put("radnoVrijemeDo", klijent.getRadnoVrijemeDo());
        return response;
    }
}
