package com.eatery.eaterybackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NarudzbaDTO {
    private Long id;
    private Long kupacId;
    private Long restoranId;
    private String restoranNaziv;
    private String sifra;
    private String status;
    private String adresaDostave;
    private BigDecimal ukupnaCijena;
    private String pin; // samo za preuzimanje vrećice iznenađenja
    private LocalDateTime preuzimanjeOd; // termin preuzimanja vrećice (null ako nema vrećice)
    private LocalDateTime preuzimanjeDo;
    private List<StavkaDTO> stavke;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StavkaDTO {
        private Long jeloId;
        private String tipStavke; // "JELO" ili "VRECICA"
        private String naziv;
        private Integer kolicina;
        private BigDecimal cijena;
    }
}