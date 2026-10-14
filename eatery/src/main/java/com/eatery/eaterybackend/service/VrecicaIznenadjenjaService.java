package com.eatery.eaterybackend.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eatery.eaterybackend.dto.VrecicaIznenadjenjaDTO;
import com.eatery.eaterybackend.entity.KorisnikEntity;
import com.eatery.eaterybackend.entity.VrecicaIznenadjenjaEntity;
import com.eatery.eaterybackend.exception.ApiException;
import com.eatery.eaterybackend.repository.KorisnikRepository;
import com.eatery.eaterybackend.repository.VrecicaIznenadjenjaRepository;

@Service
public class VrecicaIznenadjenjaService {

    private final VrecicaIznenadjenjaRepository vrecicaRepository;
    private final KorisnikRepository korisnikRepository;
    private final PreuzimanjeVreciceService preuzimanjeVreciceService;
    private final KorisnikPristupService korisnikPristupService;

    public VrecicaIznenadjenjaService(VrecicaIznenadjenjaRepository vrecicaRepository,
                                      KorisnikRepository korisnikRepository,
                                      PreuzimanjeVreciceService preuzimanjeVreciceService,
                                      KorisnikPristupService korisnikPristupService) {
        this.vrecicaRepository = vrecicaRepository;
        this.korisnikRepository = korisnikRepository;
        this.preuzimanjeVreciceService = preuzimanjeVreciceService;
        this.korisnikPristupService = korisnikPristupService;
    }

    @Transactional(readOnly = true)
    public List<VrecicaIznenadjenjaEntity> getAktivne() {
        return vrecicaRepository.findByAktivnaTrueAndKolicinaGreaterThan(0);
    }

    @Transactional(readOnly = true)
    public List<VrecicaIznenadjenjaEntity> getZaRestoran(Long restoranId, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(restoranId, authentication,
                "Nemate dozvolu za uvid u vrećice ovog restorana!");
        return vrecicaRepository.findVidljiveByRestoranId(restoranId);
    }

    @Transactional
    public VrecicaIznenadjenjaEntity dodaj(Long restoranId, VrecicaIznenadjenjaDTO dto, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(restoranId, authentication,
                "Nemate dozvolu da objavljujete vrećice u ime ovog restorana!");
        String greskaSatnice = preuzimanjeVreciceService.validirajSatnicu(
                dto.getVrijemePreuzimanjaOd(), dto.getVrijemePreuzimanjaDo());
        if (greskaSatnice != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, greskaSatnice);
        }
        KorisnikEntity restoran = korisnikRepository.findById(restoranId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Restoran nije pronađen"));
        VrecicaIznenadjenjaEntity vrecica = new VrecicaIznenadjenjaEntity();
        vrecica.setRestoran(restoran);
        primijeniPodatke(vrecica, dto);
        return vrecicaRepository.save(vrecica);
    }

    @Transactional
    public VrecicaIznenadjenjaEntity izmijeni(Long vrecicaId, VrecicaIznenadjenjaDTO dto, Authentication authentication) {
        VrecicaIznenadjenjaEntity vrecica = vlastitaVrecica(vrecicaId, authentication);
        String greskaSatnice = preuzimanjeVreciceService.validirajSatnicu(
                dto.getVrijemePreuzimanjaOd(), dto.getVrijemePreuzimanjaDo());
        if (greskaSatnice != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, greskaSatnice);
        }
        if (dto.getNaziv() == null || dto.getNaziv().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Naziv vrećice je obavezan.");
        }
        if (dto.getKolicina() == null || dto.getKolicina() < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Količina ne može biti negativna.");
        }
        primijeniPodatke(vrecica, dto);
        return vrecicaRepository.save(vrecica);
    }

    @Transactional
    public Map<String, String> ukloni(Long vrecicaId, Authentication authentication) {
        VrecicaIznenadjenjaEntity vrecica = vlastitaVrecica(vrecicaId, authentication);
        vrecica.setObrisana(true);
        vrecica.setAktivna(false);
        vrecicaRepository.save(vrecica);
        return Map.of("message", "Vrećica \"" + vrecica.getNaziv() + "\" je uklonjena iz ponude.");
    }

    @Transactional
    public String promijeniStatus(Long vrecicaId, Boolean aktivna, Authentication authentication) {
        VrecicaIznenadjenjaEntity vrecica = vlastitaVrecica(vrecicaId, authentication);
        vrecica.setAktivna(aktivna);
        vrecicaRepository.save(vrecica);
        return "Status vrećice uspešno promenjen!";
    }

    @Transactional
    public String azurirajKolicinu(Long vrecicaId, Integer kolicina, Authentication authentication) {
        VrecicaIznenadjenjaEntity vrecica = vlastitaVrecica(vrecicaId, authentication);
        vrecica.setKolicina(kolicina);
        vrecicaRepository.save(vrecica);
        return "Količina vrećice uspešno ažurirana!";
    }

    private VrecicaIznenadjenjaEntity vlastitaVrecica(Long vrecicaId, Authentication authentication) {
        KorisnikEntity ulogovani = korisnikPristupService.zahtijevajUlogovanog(authentication);
        VrecicaIznenadjenjaEntity vrecica = vrecicaRepository.findById(vrecicaId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Vrećica nije pronađena među vašim vrećicama."));
        if (Boolean.TRUE.equals(vrecica.getObrisana()) || vrecica.getRestoran() == null
                || !vrecica.getRestoran().getId().equals(ulogovani.getId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Vrećica nije pronađena među vašim vrećicama.");
        }
        return vrecica;
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
                        : BigDecimal.ONE
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
}
