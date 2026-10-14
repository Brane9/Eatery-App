package com.eatery.eaterybackend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eatery.eaterybackend.dto.RecenzijaPrikazDTO;
import com.eatery.eaterybackend.dto.RecenzijeRestoranaDTO;
import com.eatery.eaterybackend.dto.RestoranOcjenaDTO;
import com.eatery.eaterybackend.entity.KorisnikEntity;
import com.eatery.eaterybackend.entity.KupacEntity;
import org.hibernate.Hibernate;
import com.eatery.eaterybackend.repository.RecenzijaRepository;

@Service
public class RecenzijaService {

    private final RecenzijaRepository recenzijaRepository;

    public RecenzijaService(RecenzijaRepository recenzijaRepository) {
        this.recenzijaRepository = recenzijaRepository;
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
