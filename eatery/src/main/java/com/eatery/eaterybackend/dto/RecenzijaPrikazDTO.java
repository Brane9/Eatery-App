package com.eatery.eaterybackend.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RecenzijaPrikazDTO {
    private Long id;
    private Integer ocjena;
    private String komentar;
    private LocalDateTime datumKreiranja;
    private String kupac;
}
