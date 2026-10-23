package com.eatery.eaterybackend.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eatery.eaterybackend.dto.NarudzbaDTO;
import com.eatery.eaterybackend.entity.KlijentEntity;
import com.eatery.eaterybackend.entity.KorisnikEntity;
import com.eatery.eaterybackend.entity.NarudzbaEntity;
import com.eatery.eaterybackend.entity.StavkaNarudzbeEntity;
import com.eatery.eaterybackend.entity.VrecicaIznenadjenjaEntity;
import com.eatery.eaterybackend.exception.ApiException;
import com.eatery.eaterybackend.repository.KlijentRepository;
import com.eatery.eaterybackend.repository.KorisnikRepository;
import com.eatery.eaterybackend.repository.NarudzbaRepository;
import com.eatery.eaterybackend.repository.StavkaNarudzbeRepository;
import com.eatery.eaterybackend.repository.VrecicaIznenadjenjaRepository;

@Service
public class NarudzbaService {

    private final NarudzbaRepository narudzbaRepository;
    private final KorisnikRepository korisnikRepository;
    private final StavkaNarudzbeRepository stavkaNarudzbeRepository;
    private final VrecicaIznenadjenjaRepository vrecicaIznenadjenjaRepository;
    private final KlijentRepository klijentRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final StavkaNazivResolver stavkaNazivResolver;
    private final RadnoVrijemeService radnoVrijemeService;
    private final PreuzimanjeVreciceService preuzimanjeVreciceService;
    private final KorisnikPristupService korisnikPristupService;

    public NarudzbaService(NarudzbaRepository narudzbaRepository,
                           KorisnikRepository korisnikRepository,
                           StavkaNarudzbeRepository stavkaNarudzbeRepository,
                           VrecicaIznenadjenjaRepository vrecicaIznenadjenjaRepository,
                           KlijentRepository klijentRepository,
                           SimpMessagingTemplate messagingTemplate,
                           StavkaNazivResolver stavkaNazivResolver,
                           RadnoVrijemeService radnoVrijemeService,
                           PreuzimanjeVreciceService preuzimanjeVreciceService,
                           KorisnikPristupService korisnikPristupService) {
        this.narudzbaRepository = narudzbaRepository;
        this.korisnikRepository = korisnikRepository;
        this.stavkaNarudzbeRepository = stavkaNarudzbeRepository;
        this.vrecicaIznenadjenjaRepository = vrecicaIznenadjenjaRepository;
        this.klijentRepository = klijentRepository;
        this.messagingTemplate = messagingTemplate;
        this.stavkaNazivResolver = stavkaNazivResolver;
        this.radnoVrijemeService = radnoVrijemeService;
        this.preuzimanjeVreciceService = preuzimanjeVreciceService;
        this.korisnikPristupService = korisnikPristupService;
    }

    @Transactional
    public NarudzbaEntity kreirajNarudzbu(NarudzbaDTO dto, Authentication authentication) {
        KorisnikEntity ulogovaniKupac = korisnikPristupService.zahtijevajUlogovanog(authentication);
        KorisnikEntity restoran = korisnikRepository.findById(dto.getRestoranId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Restoran nije pronađen sa ID: " + dto.getRestoranId()));

        KlijentEntity klijentRestorana = klijentRepository.findById(dto.getRestoranId()).orElse(null);
        if (!radnoVrijemeService.jeOtvoren(klijentRestorana)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, radnoVrijemeService.porukaZatvoren(klijentRestorana));
        }

        List<VrecicaIznenadjenjaEntity> vreciceUNarudzbi = new ArrayList<>();
        boolean imaJelo = false;
        if (dto.getStavke() != null) {
            for (NarudzbaDTO.StavkaDTO sDTO : dto.getStavke()) {
                if ("VRECICA".equalsIgnoreCase(sDTO.getTipStavke())) {
                    if (sDTO.getJeloId() != null) {
                        VrecicaIznenadjenjaEntity v = vrecicaIznenadjenjaRepository.findById(sDTO.getJeloId()).orElse(null);
                        if (v == null || Boolean.TRUE.equals(v.getObrisana()) || !Boolean.TRUE.equals(v.getAktivna())) {
                            String naziv = v != null ? "\"" + v.getNaziv() + "\" " : "";
                            throw new ApiException(HttpStatus.BAD_REQUEST,
                                    "Vrećica " + naziv + "više nije dostupna. Uklonite je iz korpe.");
                        }
                        vreciceUNarudzbi.add(v);
                    }
                } else {
                    imaJelo = true;
                }
            }
        }

        if (imaJelo && !vreciceUNarudzbi.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Jela se dostavljaju na adresu, a vrećica iznenađenja se preuzima u restoranu. Naručite ih odvojeno.");
        }

        LocalDateTime sada = preuzimanjeVreciceService.sada();
        PreuzimanjeVreciceService.RezultatTermina rezultatTermina =
                preuzimanjeVreciceService.izracunajTermin(vreciceUNarudzbi, sada);
        if (rezultatTermina.greska() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, rezultatTermina.greska());
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
        if (!vreciceUNarudzbi.isEmpty()) {
            narudzba.setPin(String.format("%04d", new Random().nextInt(10000)));
            if (dto.getAdresaDostave() == null || dto.getAdresaDostave().isBlank()) {
                narudzba.setAdresaDostave("Preuzimanje u restoranu");
            }
        }

        NarudzbaEntity sacuvana = narudzbaRepository.save(narudzba);

        if (dto.getStavke() != null && !dto.getStavke().isEmpty()) {
            for (NarudzbaDTO.StavkaDTO sDTO : dto.getStavke()) {
                if ("VRECICA".equalsIgnoreCase(sDTO.getTipStavke())) {
                    VrecicaIznenadjenjaEntity vrecica = vrecicaIznenadjenjaRepository.findById(sDTO.getJeloId())
                            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Vrećica nije pronađena"));
                    if (vrecica.getKolicina() < sDTO.getKolicina()) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, "Nema dovoljno vrećica na stanju!");
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

        return sacuvana;
    }

    @Transactional(readOnly = true)
    public List<NarudzbaEntity> getNarudzbeZaRestoran(Long restoranId, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(restoranId, authentication,
                "Nemate dozvolu da gledate narudžbe drugog restorana!");
        return narudzbaRepository.findByRestoranId(restoranId);
    }

    @Transactional(readOnly = true)
    public List<NarudzbaDTO> getNarudzbeZaKupca(Long kupacId, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(kupacId, authentication,
                "Nemate dozvolu da gledate narudžbe drugog kupca!");

        List<NarudzbaEntity> narudzbe = narudzbaRepository.findByKupacIdWithStavke(kupacId);
        List<StavkaNarudzbeEntity> sveStavke = narudzbe.stream()
                .flatMap(n -> (n.getStavke() != null ? n.getStavke() : List.<StavkaNarudzbeEntity>of()).stream())
                .toList();
        var katalog = stavkaNazivResolver.katalogZa(sveStavke);

        return narudzbe.stream().map(n -> {
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
            dto.setPin(n.getPin());
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
    }

    @Transactional
    public String promjeniStatus(Long id, String status, Authentication authentication) {
        KorisnikEntity ulogovani = korisnikPristupService.zahtijevajUlogovanog(authentication);
        NarudzbaEntity narudzba = narudzbaRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Narudžba sa ID " + id + " nije pronađena!"));

        if (narudzba.getRestoran() == null || !narudzba.getRestoran().getId().equals(ulogovani.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Nemate dozvolu da menjate status narudžbe koja ne pripada vašem restoranu!");
        }

        String trenutniStatus = narudzba.getStatus() != null ? narudzba.getStatus().toUpperCase() : "";
        String noviStatus = status != null ? status.toUpperCase() : "";

        if ("DOSTAVLJENO".equals(trenutniStatus) || "PREUZETO".equals(trenutniStatus)
                || "OTKAZANO".equals(trenutniStatus) || "OTKAZANA".equals(trenutniStatus)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Status zavrešene narudžbe se više ne može mijenjati!");
        }
        if ("SPREMNO".equals(trenutniStatus) && "U_PRIPREMI".equals(noviStatus)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Narudžba koja je označena kao SPREMNO ne može se vratiti u pripremu!");
        }

        if (narudzba.getSifra() == null || narudzba.getSifra().isEmpty()) {
            narudzba.setSifra("ORD-" + System.currentTimeMillis());
        }
        narudzba.setStatus(noviStatus);
        narudzbaRepository.save(narudzba);
        return "Status uspešno promenjen u: " + noviStatus;
    }
}
