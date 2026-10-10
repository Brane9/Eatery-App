package com.eatery.eaterybackend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class AdminProfilDTO {
    private Long id;
    private String korisnickoIme;
    private String email;
    private String uloga;
    private Boolean aktiviran;
    private String prikazIme;
    private String adresa;
    private Boolean suspendovan;
    private LocalDateTime suspendovanDo;

    private String ime;
    private Boolean cestiKupac;
    private Integer popust;
    private Long ukupnoNarudzbi;
    private Long ukupnoVrecica;
    private BigDecimal ukupnaUstedaKM;

    private String nazivObjekta;
    private Double lat;
    private Double lng;
    private String radnoVrijemeOd;
    private String radnoVrijemeDo;
    private Double prosjecnaOcjena;
    private Long ukupanBrojOcjena;
    private Long brojJela;
    private Long brojOglasa;
}
