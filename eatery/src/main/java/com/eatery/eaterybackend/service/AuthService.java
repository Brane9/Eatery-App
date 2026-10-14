package com.eatery.eaterybackend.service;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eatery.eaterybackend.dto.LoginRequestDTO;
import com.eatery.eaterybackend.dto.LoginResponseDTO;
import com.eatery.eaterybackend.dto.RegistracijaKlijentaDTO;
import com.eatery.eaterybackend.dto.RegistracijaKupcaDTO;
import com.eatery.eaterybackend.entity.KlijentEntity;
import com.eatery.eaterybackend.entity.KorisnikEntity;
import com.eatery.eaterybackend.entity.KupacEntity;
import com.eatery.eaterybackend.entity.OpisEntity;
import com.eatery.eaterybackend.entity.ZahtjevZaAktivacijuEntity;
import com.eatery.eaterybackend.exception.ApiException;
import com.eatery.eaterybackend.repository.KorisnikRepository;
import com.eatery.eaterybackend.repository.OpisRepository;
import com.eatery.eaterybackend.repository.ZahtjevZaAktivacijuRepository;
import com.eatery.eaterybackend.security.JwtUtils;
import com.eatery.eaterybackend.util.SuspenzijaUtil;

@Service
public class AuthService {

    private final KorisnikRepository korisnikRepository;
    private final ZahtjevZaAktivacijuRepository zahtjevRepository;
    private final OpisRepository opisRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public AuthService(KorisnikRepository korisnikRepository,
                       ZahtjevZaAktivacijuRepository zahtjevRepository,
                       OpisRepository opisRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtils jwtUtils) {
        this.korisnikRepository = korisnikRepository;
        this.zahtjevRepository = zahtjevRepository;
        this.opisRepository = opisRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    @Transactional
    public Map<String, String> registrujKupca(RegistracijaKupcaDTO dto) {
        if (korisnikRepository.findByKorisnickoIme(dto.getKorisnickoIme()).isPresent()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Korisničko ime je već zauzeto!");
        }
        if (dto.getEmail() != null && korisnikRepository.existsByEmail(dto.getEmail())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email je već zauzet!");
        }
        if (dto.getIme() == null || dto.getIme().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ime je obavezno!");
        }

        KupacEntity kupac = new KupacEntity();
        kupac.setKorisnickoIme(dto.getKorisnickoIme());
        kupac.setSifra(passwordEncoder.encode(dto.getSifra()));
        kupac.setEmail(dto.getEmail());
        kupac.setUloga("KUPAC");
        kupac.setAktiviran(true);
        kupac.setIme(dto.getIme().trim());
        korisnikRepository.save(kupac);

        return Map.of("message", "Uspješna registracija! Sada se možete prijaviti.");
    }

    @Transactional
    public Map<String, String> registrujKlijenta(RegistracijaKlijentaDTO dto) {
        if (korisnikRepository.findByKorisnickoIme(dto.getKorisnickoIme()).isPresent()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Korisničko ime je već zauzeto!");
        }
        if (dto.getEmail() != null && korisnikRepository.existsByEmail(dto.getEmail())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email je već zauzet!");
        }
        if (dto.getNazivObjekta() == null || dto.getNazivObjekta().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Naziv objekta je obavezan!");
        }

        KlijentEntity klijent = new KlijentEntity();
        klijent.setKorisnickoIme(dto.getKorisnickoIme());
        klijent.setSifra(passwordEncoder.encode(dto.getSifra()));
        klijent.setEmail(dto.getEmail());
        klijent.setUloga("KLIJENT");
        klijent.setAktiviran(false);
        klijent.setNazivObjekta(dto.getNazivObjekta().trim());

        if (dto.getOpis() != null && !dto.getOpis().isBlank()) {
            OpisEntity opis = new OpisEntity();
            opis.setTip("RESTORAN");
            opis.setSadrzaj(dto.getOpis().trim());
            opisRepository.save(opis);
            klijent.setOpis(opis);
        }

        KorisnikEntity sacuvaniKorisnik = korisnikRepository.save(klijent);
        ZahtjevZaAktivacijuEntity zahtjev = new ZahtjevZaAktivacijuEntity();
        zahtjev.setKorisnik(sacuvaniKorisnik);
        zahtjevRepository.save(zahtjev);

        return Map.of("message", "Zahtjev za registraciju restorana je poslat. Nalog čeka odobrenje administratora.");
    }

    @Transactional
    public LoginResponseDTO login(LoginRequestDTO dto) {
        KorisnikEntity korisnik = korisnikRepository.findByKorisnickoIme(dto.getKorisnickoIme())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Neispravno korisničko ime ili lozinka!"));

        boolean isSifraIsprvana = passwordEncoder.matches(dto.getSifra(), korisnik.getSifra())
                || korisnik.getSifra().equals(dto.getSifra());
        if (!isSifraIsprvana) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Neispravno korisničko ime ili lozinka!");
        }

        if (SuspenzijaUtil.ocistiAkoIstekla(korisnik)) {
            korisnikRepository.save(korisnik);
        }
        if (SuspenzijaUtil.jeAktivna(korisnik)) {
            throw new ApiException(HttpStatus.FORBIDDEN, SuspenzijaUtil.poruka(korisnik));
        }
        if (!"ADMINISTRATOR".equalsIgnoreCase(korisnik.getUloga())
                && !Boolean.TRUE.equals(korisnik.getAktiviran())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Nalog još uvijek nije aktiviran od strane administratora!");
        }

        String token = jwtUtils.generateToken(korisnik.getKorisnickoIme(), korisnik.getUloga(), korisnik.getId());
        return new LoginResponseDTO(token, korisnik.getId(), korisnik.getKorisnickoIme(), korisnik.getUloga(), null);
    }
}
