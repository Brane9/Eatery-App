package com.eatery.eaterybackend.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.eatery.eaterybackend.dto.RestoranMapaDTO;
import com.eatery.eaterybackend.dto.RestoranOcjenaDTO;
import com.eatery.eaterybackend.dto.UpdateKlijentProfilDTO;
import com.eatery.eaterybackend.entity.KlijentEntity;
import com.eatery.eaterybackend.exception.ApiException;
import com.eatery.eaterybackend.repository.KlijentRepository;

@Service
public class RestoranMapaService {

    private final KlijentRepository klijentRepository;
    private final RecenzijaService recenzijaService;
    private final KorisnikPristupService korisnikPristupService;

    public RestoranMapaService(KlijentRepository klijentRepository,
                               RecenzijaService recenzijaService,
                               KorisnikPristupService korisnikPristupService) {
        this.klijentRepository = klijentRepository;
        this.recenzijaService = recenzijaService;
        this.korisnikPristupService = korisnikPristupService;
    }

    @Transactional
    public Map<String, Object> azurirajLokaciju(Long restoranId, UpdateKlijentProfilDTO dto, Authentication authentication) {
        korisnikPristupService.zahtijevajVlasnistvo(restoranId, authentication,
                "Nemate dozvolu da mijenjate lokaciju ovog restorana!");

        String adresa = dto.getAdresa();
        if (adresa == null || adresa.trim().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Adresa ne smije biti prazna.");
        }

        Double lat = dto.getLat();
        Double lng = dto.getLng();
        if (lat == null || lng == null) {
            try {
                RestTemplate restTemplate = new RestTemplate();
                String url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ba&q="
                        + URLEncoder.encode(adresa.trim(), StandardCharsets.UTF_8);
                HttpHeaders headers = new HttpHeaders();
                headers.set("User-Agent", "EateryApp/1.0 (kontakt@eatery.ba)");
                ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), List.class);
                if (response.getBody() != null && !response.getBody().isEmpty()) {
                    Map<String, Object> prvaLokacija = (Map<String, Object>) response.getBody().get(0);
                    lat = Double.parseDouble(prvaLokacija.get("lat").toString());
                    lng = Double.parseDouble(prvaLokacija.get("lon").toString());
                }
            } catch (ApiException e) {
                throw e;
            } catch (Exception e) {
                throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Greška pri komunikaciji sa servisom za mape.");
            }
        }

        if (lat == null || lng == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unesena adresa nije pronađena na mapi. Molimo unesite tačnu adresu.");
        }

        if (klijentRepository.postojiKlijent(restoranId) > 0) {
            klijentRepository.azurirajKlijenta(restoranId, adresa.trim(), lat, lng);
        } else {
            klijentRepository.ubaciKlijenta(restoranId, adresa.trim(), lat, lng);
        }

        return Map.of("poruka", "Lokacija uspješno sačuvana.", "adresa", adresa.trim(), "lat", lat, "lng", lng);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getLokacija(Long restoranId) {
        KlijentEntity klijent = klijentRepository.findById(restoranId).orElse(null);
        if (klijent == null) {
            return Map.of("adresa", "", "lat", 0.0, "lng", 0.0);
        }
        return Map.of(
                "adresa", klijent.getAdresa() != null ? klijent.getAdresa() : "",
                "lat", klijent.getLat() != null ? klijent.getLat() : 0.0,
                "lng", klijent.getLng() != null ? klijent.getLng() : 0.0
        );
    }

    @Transactional(readOnly = true)
    public List<RestoranMapaDTO> getRestoraniUBlizini(double lat, double lng, double radijusKm) {
        List<RestoranMapaDTO> rezultat = new ArrayList<>();
        for (KlijentEntity r : klijentRepository.findAll()) {
            if (Boolean.TRUE.equals(r.getAktiviran()) && r.getLat() != null && r.getLng() != null) {
                double dist = izracunajUdaljenostKm(lat, lng, r.getLat(), r.getLng());
                if (dist <= radijusKm) {
                    RestoranOcjenaDTO ocjena = recenzijaService.ocjenaZaRestoran(r.getId());
                    rezultat.add(new RestoranMapaDTO(
                            r.getId(),
                            r.getNazivObjekta(),
                            r.getAdresa(),
                            r.getLat(),
                            r.getLng(),
                            Math.round(dist * 10.0) / 10.0,
                            r.getRadnoVrijemeOd(),
                            r.getRadnoVrijemeDo(),
                            ocjena.getProsjecnaOcjena(),
                            ocjena.getUkupanBrojOcjena()
                    ));
                }
            }
        }
        return rezultat;
    }

    private double izracunajUdaljenostKm(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
