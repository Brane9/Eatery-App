package com.eatery.eaterybackend.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.Comparator;

import com.eatery.eaterybackend.dto.RestoranOcjenaDTO;
import com.eatery.eaterybackend.entity.KlijentEntity;
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
    private final RecenzijaService recenzijaService;

    public VrecicaIznenadjenjaService(VrecicaIznenadjenjaRepository vrecicaRepository,
                                      KorisnikRepository korisnikRepository,
                                      PreuzimanjeVreciceService preuzimanjeVreciceService,
                                      KorisnikPristupService korisnikPristupService,
                                      RecenzijaService recenzijaService) {
        this.vrecicaRepository = vrecicaRepository;
        this.korisnikRepository = korisnikRepository;
        this.preuzimanjeVreciceService = preuzimanjeVreciceService;
        this.korisnikPristupService = korisnikPristupService;
        this.recenzijaService = recenzijaService;
    }

    @Transactional(readOnly = true)
    public List<VrecicaIznenadjenjaEntity> getAktivne(Double lat, Double lng) {

        List<VrecicaIznenadjenjaEntity> vrecice = new ArrayList<>(
                vrecicaRepository.findByAktivnaTrueAndKolicinaGreaterThan(0)
        );

        vrecice.forEach(v -> {
            if (v.getRestoran() instanceof KlijentEntity restoran) {
                RestoranOcjenaDTO ocjena =
                        recenzijaService.ocjenaZaRestoran(restoran.getId());

                restoran.setProsjecnaOcjena(ocjena.getProsjecnaOcjena());
                restoran.setUkupanBrojOcjena(ocjena.getUkupanBrojOcjena());
            }
        });

        // Sortiranje se radi samo ako su dostupne obje koordinate kupca
        if (lat != null && lng != null) {
            vrecice.sort(Comparator.comparingDouble(v ->
                    izracunajUdaljenostDoRestorana(v, lat, lng)
            ));
        }

        return vrecice;
    }

    private double izracunajUdaljenostDoRestorana(
            VrecicaIznenadjenjaEntity vrecica,
            double kupacLat,
            double kupacLng) {

        if (!(vrecica.getRestoran() instanceof KlijentEntity restoran)
                || restoran.getLat() == null
                || restoran.getLng() == null) {

            // Restorani bez koordinata ne mogu imati izračunatu udaljenost,
            // pa im dodjeljujemo beskonačnu vrijednost kako bi njihove
            // vrećice bile prikazane na kraju liste prilikom sortiranja
            return Double.POSITIVE_INFINITY;
        }

        return izracunajUdaljenostKm(
                kupacLat,
                kupacLng,
                restoran.getLat(),
                restoran.getLng()
        );
    }

    private double izracunajUdaljenostKm(
            double lat1, double lon1,
            double lat2, double lon2) {

        final int R = 6371;

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2)
                * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
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
