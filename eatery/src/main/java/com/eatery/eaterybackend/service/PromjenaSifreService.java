package com.eatery.eaterybackend.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eatery.eaterybackend.dto.PromjenaSifreDTO;
import com.eatery.eaterybackend.entity.KorisnikEntity;
import com.eatery.eaterybackend.entity.ZahtjevZaPromjenuSifreEntity;
import com.eatery.eaterybackend.exception.ApiException;
import com.eatery.eaterybackend.repository.ZahtjevZaPromjenuSifreRepository;

@Service
public class PromjenaSifreService {

    private static final int MIN_DUZINA = 6;

    private final KorisnikPristupService korisnikPristupService;
    private final ZahtjevZaPromjenuSifreRepository zahtjevRepository;
    private final PasswordEncoder passwordEncoder;

    public PromjenaSifreService(KorisnikPristupService korisnikPristupService,
                                ZahtjevZaPromjenuSifreRepository zahtjevRepository,
                                PasswordEncoder passwordEncoder) {
        this.korisnikPristupService = korisnikPristupService;
        this.zahtjevRepository = zahtjevRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> status(Authentication authentication) {
        KorisnikEntity korisnik = korisnikPristupService.zahtijevajUlogovanog(authentication);
        Map<String, Object> odgovor = new HashMap<>();
        zahtjevRepository.findByKorisnikId(korisnik.getId()).ifPresentOrElse(
                z -> {
                    odgovor.put("naCekanju", true);
                    odgovor.put("datumPodnosenja", z.getDatumPodnosenja());
                },
                () -> odgovor.put("naCekanju", false));
        return odgovor;
    }

    @Transactional
    public Map<String, String> posaljiZahtjev(PromjenaSifreDTO dto, Authentication authentication) {
        KorisnikEntity korisnik = korisnikPristupService.zahtijevajUlogovanog(authentication);
        if ("ADMINISTRATOR".equalsIgnoreCase(korisnik.getUloga())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Administrator ne može slati zahtjev za promjenu šifre.");
        }

        String trenutna = dto.getTrenutnaSifra() == null ? "" : dto.getTrenutnaSifra();
        String nova = dto.getNovaSifra() == null ? "" : dto.getNovaSifra();

        if (!sifraOdgovara(trenutna, korisnik.getSifra())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Trenutna šifra nije ispravna.");
        }
        if (nova.isBlank() || nova.length() < MIN_DUZINA) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Nova šifra mora imati najmanje " + MIN_DUZINA + " znakova.");
        }
        if (sifraOdgovara(nova, korisnik.getSifra())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Nova šifra mora biti različita od trenutne.");
        }

        ZahtjevZaPromjenuSifreEntity zahtjev = zahtjevRepository.findByKorisnikId(korisnik.getId())
                .orElseGet(ZahtjevZaPromjenuSifreEntity::new);
        boolean zamijenjen = zahtjev.getId() != null;
        zahtjev.setKorisnik(korisnik);
        zahtjev.setNovaSifra(passwordEncoder.encode(nova));
        zahtjev.setDatumPodnosenja(LocalDateTime.now());
        zahtjevRepository.save(zahtjev);

        String poruka = "Zahtjev za promjenu šifre je poslan administratoru. Nova šifra će važiti nakon odobrenja.";
        if (zamijenjen) {
            poruka += " Prethodni zahtjev je zamijenjen ovim.";
        }
        return Map.of("message", poruka);
    }

    private boolean sifraOdgovara(String unesena, String sacuvana) {
        if (sacuvana == null) {
            return false;
        }
        return passwordEncoder.matches(unesena, sacuvana) || sacuvana.equals(unesena);
    }
}
