package com.eatery.eaterybackend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import lombok.Data;

@Data
public class MojeNarudzbeDTO {
    private Long id;
    private String sifra;
    private String status;
    private BigDecimal ukupnaCijena;
    private String adresaDostave;
    private LocalDateTime vrijemeKreiranja;
    private String restoranNaziv;
    private List<StavkaPregledDTO> stavke;

    private String pin;

    private LocalDateTime preuzimanjeOd;
    private LocalDateTime preuzimanjeDo;

    @Data
    public static class StavkaPregledDTO {
        private String nazivJela;
        private Integer kolicina;
        private BigDecimal cijena;
        private String tipStavke;
    }
}
