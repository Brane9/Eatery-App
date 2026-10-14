package com.eatery.eaterybackend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.hibernate.Hibernate;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eatery.eaterybackend.dto.KreirajRecenzijuDTO;
import com.eatery.eaterybackend.dto.RecenzijaPrikazDTO;
import com.eatery.eaterybackend.dto.RecenzijeRestoranaDTO;
import com.eatery.eaterybackend.dto.RestoranOcjenaDTO;
import com.eatery.eaterybackend.entity.KorisnikEntity;
import com.eatery.eaterybackend.entity.KupacEntity;
import com.eatery.eaterybackend.entity.NarudzbaEntity;
import com.eatery.eaterybackend.entity.RecenzijaEntity;
import com.eatery.eaterybackend.exception.ApiException;
import com.eatery.eaterybackend.repository.NarudzbaRepository;
import com.eatery.eaterybackend.repository.RecenzijaRepository;

@Service
public class RecenzijaService {

    private final RecenzijaRepository recenzijaRepository;
    private final NarudzbaRepository narudzbaRepository;
    private final KorisnikPristupService korisnikPristupService;

    public RecenzijaService(RecenzijaRepository recenzijaRepository,
                            NarudzbaRepository narudzbaRepository,
                            KorisnikPristupService korisnikPristupService) {
        this.recenzijaRepository = recenzijaRepository;
        this.narudzbaRepository = narudzbaRepository;
        this.korisnikPristupService = korisnikPristupService;
    }

    @Transactional
    public String dodajRecenziju(KreirajRecenzijuDTO dto, Authentication authentication) {
        if (dto.getOcjena() == null || dto.getOcjena() < 1 || dto.getOcjena() > 5) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ocjena mora biti između 1 i 5.");
        }

        NarudzbaEntity narudzba = narudzbaRepository.findById(dto.getIdNarudzbe())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Narudžba nije pronađena."));

        String status = narudzba.getStatus() != null ? narudzba.getStatus().toUpperCase() : "";
        if (!status.equals("DOSTAVLJENO") && !status.equals("PREUZETO")) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Moguće je ocjenjivati samo realizovane (dostavljene/preuzete) narudžbe.");
        }
        if (recenzijaRepository.existsByNarudzbaId(dto.getIdNarudzbe())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ova narudžba je već ocjenjena.");
        }

        KorisnikEntity kupac = korisnikPristupService.zahtijevajUlogovanog(authentication);
        if (narudzba.getKupac() == null || !kupac.getId().equals(narudzba.getKupac().getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Možete ocjenjivati samo vlastite narudžbe.");
        }
        if (narudzba.getRestoran() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Narudžba nema povezan restoran.");
        }

        RecenzijaEntity recenzija = new RecenzijaEntity();
        recenzija.setOcjena(dto.getOcjena());
        recenzija.setKomentar(dto.getKomentar());
        recenzija.setDatumKreiranja(LocalDateTime.now());
        recenzija.setKupac(kupac);
        recenzija.setRestoran(narudzba.getRestoran());
        recenzija.setNarudzba(narudzba);
        recenzijaRepository.save(recenzija);
        return "Recenzija uspješno dodana.";
    }

    @Transactional(readOnly = true)
    public RestoranOcjenaDTO mojaOcjena(Authentication authentication) {
        KorisnikEntity restoran = korisnikPristupService.zahtijevajUlogovanog(authentication);
        return ocjenaZaRestoran(restoran.getId());
    }

    @Transactional(readOnly = true)
    public boolean jeOcjenjena(Long idNarudzbe) {
        return recenzijaRepository.existsByNarudzbaId(idNarudzbe);
    }

    @Transactional(readOnly = true)
    public RestoranOcjenaDTO ocjenaZaRestoran(Long restoranId) {
        if (restoranId == null) {
            return new RestoranOcjenaDTO(0.0, 0L);
        }

        List<Object[]> redovi = recenzijaRepository.agregirajOcjenePoRestoranu(restoranId);
        Object[] red = izvuciRed(redovi);

        long broj = Math.round(kaoBroj(red.length > 1 ? red[1] : 0));
        double prosjek = broj == 0 ? 0.0 : Math.round(kaoBroj(red[0]) * 10.0) / 10.0;

        return new RestoranOcjenaDTO(prosjek, broj);
    }

    @Transactional(readOnly = true)
    public RecenzijeRestoranaDTO recenzijeZaRestoran(Long restoranId) {
        RestoranOcjenaDTO ocjena = ocjenaZaRestoran(restoranId);
        List<RecenzijaPrikazDTO> recenzije = restoranId == null ? List.of()
                : recenzijaRepository.findZaPrikazByRestoranId(restoranId).stream()
                        .map(r -> new RecenzijaPrikazDTO(
                                r.getId(),
                                r.getOcjena(),
                                r.getKomentar() == null || r.getKomentar().isBlank() ? null : r.getKomentar().trim(),
                                r.getDatumKreiranja(),
                                prikazImena(r.getKupac())))
                        .toList();
        return new RecenzijeRestoranaDTO(ocjena.getProsjecnaOcjena(), ocjena.getUkupanBrojOcjena(), recenzije);
    }

    private String prikazImena(KorisnikEntity korisnik) {
        if (korisnik == null) {
            return "Kupac";
        }
        KorisnikEntity k = (KorisnikEntity) Hibernate.unproxy(korisnik);
        String ime = k instanceof KupacEntity kupac ? kupac.getIme() : null;
        if (ime == null || ime.isBlank()) {
            return k.getKorisnickoIme() != null ? k.getKorisnickoIme() : "Kupac";
        }
        String[] dijelovi = ime.trim().split("\\s+");
        if (dijelovi.length == 1) {
            return dijelovi[0];
        }
        return dijelovi[0] + " " + dijelovi[dijelovi.length - 1].charAt(0) + ".";
    }

    private Object[] izvuciRed(List<Object[]> redovi) {
        if (redovi == null || redovi.isEmpty() || redovi.get(0) == null) {
            return new Object[] {0, 0};
        }
        Object prvi = redovi.get(0);
        if (prvi instanceof Object[] arr) {
            return arr;
        }
        Object drugi = redovi.size() > 1 ? redovi.get(1) : 0;
        return new Object[] {prvi, drugi};
    }

    private double kaoBroj(Object value) {
        if (value instanceof Number n) {
            return n.doubleValue();
        }
        return 0;
    }
}
