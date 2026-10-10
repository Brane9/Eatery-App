package com.eatery.eaterybackend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class AdminRecenzijaDTO {
    private Long id;
    private Integer ocjena;
    private String komentar;
    private LocalDateTime datumKreiranja;
    private Long kupacId;
    private String kupac;
    private Long restoranId;
    private String restoran;
    private Long narudzbaId;
    private String sifraNarudzbe;
}
