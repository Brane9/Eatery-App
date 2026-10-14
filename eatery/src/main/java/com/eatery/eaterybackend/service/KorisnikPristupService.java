package com.eatery.eaterybackend.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import com.eatery.eaterybackend.entity.KorisnikEntity;
import com.eatery.eaterybackend.exception.ApiException;
import com.eatery.eaterybackend.repository.KorisnikRepository;

@Service
public class KorisnikPristupService {

    private final KorisnikRepository korisnikRepository;

    public KorisnikPristupService(KorisnikRepository korisnikRepository) {
        this.korisnikRepository = korisnikRepository;
    }

    public KorisnikEntity zahtijevajUlogovanog(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Niste autentifikovani!");
        }
        return korisnikRepository.findByKorisnickoIme(authentication.getName())
                .or(() -> korisnikRepository.findByEmail(authentication.getName()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Korisnik nije pronađen."));
    }

    public boolean jeVlasnik(Long korisnikId, Authentication authentication) {
        if (authentication == null || korisnikId == null) {
            return false;
        }
        Object details = authentication.getDetails();
        if (details instanceof Number id) {
            return korisnikId.equals(id.longValue());
        }
        KorisnikEntity ulogovani = korisnikRepository.findByKorisnickoIme(authentication.getName()).orElse(null);
        return ulogovani != null && korisnikId.equals(ulogovani.getId());
    }

    public void zahtijevajVlasnistvo(Long korisnikId, Authentication authentication, String poruka) {
        if (!jeVlasnik(korisnikId, authentication)) {
            throw new ApiException(HttpStatus.FORBIDDEN, poruka);
        }
    }
}
