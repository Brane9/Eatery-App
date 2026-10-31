package com.eatery.eaterybackend.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eatery.eaterybackend.dto.KreirajNarudzbuDTO;
import com.eatery.eaterybackend.dto.KupacProfilDTO;
import com.eatery.eaterybackend.dto.MojeNarudzbeDTO;
import com.eatery.eaterybackend.dto.RestoranOcjenaDTO;
import com.eatery.eaterybackend.dto.StavkaNarudzbeDTO;
import com.eatery.eaterybackend.dto.UpdateKupacProfilDTO;
import com.eatery.eaterybackend.entity.JeloEntity;
import com.eatery.eaterybackend.entity.KlijentEntity;
import com.eatery.eaterybackend.entity.KorisnikEntity;
import com.eatery.eaterybackend.entity.KupacEntity;
import com.eatery.eaterybackend.entity.NarudzbaEntity;
import com.eatery.eaterybackend.entity.StavkaNarudzbeEntity;
import com.eatery.eaterybackend.exception.ApiException;
import com.eatery.eaterybackend.repository.JeloRepository;
import com.eatery.eaterybackend.repository.KlijentRepository;
import com.eatery.eaterybackend.repository.KorisnikRepository;
import com.eatery.eaterybackend.repository.KupacRepository;
import com.eatery.eaterybackend.repository.NarudzbaRepository;
import com.eatery.eaterybackend.repository.StavkaNarudzbeRepository;

@Service
public class KupacService {

    private final KorisnikRepository korisnikRepository;
    private final KupacRepository kupacRepository;
    private final KlijentRepository klijentRepository;
    private final JeloRepository jeloRepository;
    private final NarudzbaRepository narudzbaRepository;
    private final StavkaNarudzbeRepository stavkaNarudzbeRepository;
    private final RecenzijaService recenzijaService;
    private final StavkaNazivResolver stavkaNazivResolver;
    private final RadnoVrijemeService radnoVrijemeService;
    private final KorisnikPristupService korisnikPristupService;

    public KupacService(KorisnikRepository korisnikRepository,
                        KupacRepository kupacRepository,
                        KlijentRepository klijentRepository,
                        JeloRepository jeloRepository,
                        NarudzbaRepository narudzbaRepository,
                        StavkaNarudzbeRepository stavkaNarudzbeRepository,
                        RecenzijaService recenzijaService,
                        StavkaNazivResolver stavkaNazivResolver,
                        RadnoVrijemeService radnoVrijemeService,
                        KorisnikPristupService korisnikPristupService) {
        this.korisnikRepository = korisnikRepository;
        this.kupacRepository = kupacRepository;
        this.klijentRepository = klijentRepository;
        this.jeloRepository = jeloRepository;
        this.narudzbaRepository = narudzbaRepository;
        this.stavkaNarudzbeRepository = stavkaNarudzbeRepository;
        this.recenzijaService = recenzijaService;
        this.stavkaNazivResolver = stavkaNazivResolver;
        this.radnoVrijemeService = radnoVrijemeService;
        this.korisnikPristupService = korisnikPristupService;
    }

    @Transactional(readOnly = true)
    public KupacProfilDTO getProfil(Long kupacId, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(kupacId, authentication,
                "Nemate dozvolu za pristup ovom profilu!");

        KorisnikEntity korisnik = korisnikRepository.findById(kupacId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Korisnik nije pronađen sa ID: " + kupacId));
        if (korisnik.getUloga() == null || !"KUPAC".equalsIgnoreCase(korisnik.getUloga())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Korisnik sa ID " + kupacId + " nije kupac.");
        }

        KupacEntity kupac = kupacRepository.findById(kupacId).orElse(null);
        Long ukupnoVrecica = narudzbaRepository.prebrojVrecicePoKupcu(kupacId);
        BigDecimal ukupnaUsteda = narudzbaRepository.izracunajUsteduPoKupcu(kupacId);

        KupacProfilDTO dto = new KupacProfilDTO();
        dto.setIdKorisnika(korisnik.getId());
        dto.setEmail(korisnik.getEmail());
        dto.setKorisnickoIme(korisnik.getKorisnickoIme());
        if (kupac != null) {
            dto.setIme(kupac.getIme());
            dto.setCestiKupac(kupac.getCestiKupac());
            dto.setPopust(kupac.getPopust());
        }
        dto.setUkupnoVrecica(ukupnoVrecica != null ? ukupnoVrecica : 0L);
        dto.setUkupnaUstedaKM(ukupnaUsteda != null ? ukupnaUsteda : BigDecimal.ZERO);
        return dto;
    }

    @Transactional
    public KupacProfilDTO updateProfil(Long kupacId, UpdateKupacProfilDTO dto, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(kupacId, authentication,
                "Nemate dozvolu da menjate ovaj profil!");

        KorisnikEntity korisnik = korisnikRepository.findById(kupacId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Korisnik nije pronađen sa ID: " + kupacId));
        if (korisnik.getUloga() == null || !"KUPAC".equalsIgnoreCase(korisnik.getUloga())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Korisnik nije kupac.");
        }

        KupacEntity kupac = kupacRepository.findById(kupacId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Profil kupca nije pronađen."));

        String novoIme = dto.getIme() != null ? dto.getIme().trim() : "";
        String noviEmail = dto.getEmail() != null ? dto.getEmail().trim() : "";
        String novoKorisnickoIme = dto.getKorisnickoIme() != null ? dto.getKorisnickoIme().trim() : "";
        if (novoIme.isEmpty() || noviEmail.isEmpty() || novoKorisnickoIme.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ime, email i korisničko ime su obavezni.");
        }
        if (!noviEmail.equalsIgnoreCase(kupac.getEmail()) && korisnikRepository.existsByEmail(noviEmail)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email je već zauzet.");
        }
        if (!novoKorisnickoIme.equalsIgnoreCase(kupac.getKorisnickoIme())
                && korisnikRepository.existsByKorisnickoIme(novoKorisnickoIme)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Korisničko ime je već zauzeto.");
        }

        kupac.setIme(novoIme);
        kupac.setEmail(noviEmail);
        kupac.setKorisnickoIme(novoKorisnickoIme);
        kupacRepository.save(kupac);
        return getProfil(kupacId, authentication);
    }

    @Transactional(readOnly = true)
    public List<KlijentEntity> getAktivniRestorani() {
        return klijentRepository.findAll().stream()
                .filter(k -> Boolean.TRUE.equals(k.getAktiviran()))
                .peek(k -> {
                    RestoranOcjenaDTO ocjena = recenzijaService.ocjenaZaRestoran(k.getId());
                    k.setProsjecnaOcjena(ocjena.getProsjecnaOcjena());
                    k.setUkupanBrojOcjena(ocjena.getUkupanBrojOcjena());
                })
                .toList();
    }

    @Transactional
    public String kreirajNarudzbu(KreirajNarudzbuDTO dto, Authentication authentication) {
        KorisnikEntity ulogovaniKupac = korisnikPristupService.zahtijevajUlogovanog(authentication);
        KorisnikEntity restoran = korisnikRepository.findById(dto.getRestoranId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Restoran nije pronađen sa ID: " + dto.getRestoranId()));

        KlijentEntity klijentRestorana = klijentRepository.findById(dto.getRestoranId()).orElse(null);
        if (!radnoVrijemeService.jeOtvoren(klijentRestorana)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, radnoVrijemeService.porukaZatvoren(klijentRestorana));
        }

        NarudzbaEntity narudzba = new NarudzbaEntity();
        narudzba.setKupac(ulogovaniKupac);
        narudzba.setRestoran(restoran);
        narudzba.setAdresaDostave(dto.getAdresaDostave());
        narudzba.setUkupnaCijena(BigDecimal.ZERO);
        NarudzbaEntity sacuvanaNarudzba = narudzbaRepository.save(narudzba);

        BigDecimal ukupno = BigDecimal.ZERO;
        for (StavkaNarudzbeDTO sDTO : dto.getStavke()) {
            JeloEntity jelo = jeloRepository.findById(sDTO.getJeloId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Jelo nije pronađeno sa ID: " + sDTO.getJeloId()));

            StavkaNarudzbeEntity stavka = new StavkaNarudzbeEntity();
            stavka.setIdNarudzbe(sacuvanaNarudzba.getId());
            stavka.setIdJela(sDTO.getJeloId());
            stavka.setKolicina(sDTO.getKolicina());
            stavka.setTipStavke("JELO");
            stavka.setNaziv(jelo.getNaziv());
            BigDecimal cijenaStavke = jelo.getCijena().multiply(BigDecimal.valueOf(sDTO.getKolicina()));
            stavka.setCijena(cijenaStavke);
            stavkaNarudzbeRepository.save(stavka);
            ukupno = ukupno.add(cijenaStavke);
        }

        sacuvanaNarudzba.setUkupnaCijena(ukupno);
        narudzbaRepository.save(sacuvanaNarudzba);
        return "Narudžba uspešno poslana!";
    }

    @Transactional(readOnly = true)
    public List<JeloEntity> getJelaZaRestoran(Long restoranId) {
        return jeloRepository.findAll().stream()
                .filter(j -> j.getRestoran() != null && restoranId.equals(j.getRestoran().getId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MojeNarudzbeDTO> getNarudzbeKupca(Long kupacId, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(kupacId, authentication,
                "Nemate dozvolu da gledate narudžbe drugog kupca!");

        List<NarudzbaEntity> narudzbe = narudzbaRepository.findByKupacIdWithStavke(kupacId);
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
            dto.setPin(n.getPin());
            dto.setPreuzimanjeOd(n.getPreuzimanjeOd());
            dto.setPreuzimanjeDo(n.getPreuzimanjeDo());
            if (n.getRestoran() != null) {
                dto.setRestoranNaziv(n.getRestoran().getKorisnickoIme());
            }
            List<StavkaNarudzbeEntity> stavkeEnt = n.getStavke() != null ? n.getStavke() : List.of();
            dto.setStavke(stavkeEnt.stream().map(s -> {
                MojeNarudzbeDTO.StavkaPregledDTO sd = new MojeNarudzbeDTO.StavkaPregledDTO();
                sd.setKolicina(s.getKolicina());
                sd.setCijena(s.getCijena());
                sd.setNazivJela(stavkaNazivResolver.naziv(s, katalog));
                sd.setTipStavke(s.getTipStavke());
                return sd;
            }).toList());
            return dto;
        }).toList();
    }
}
