package com.eatery.eaterybackend.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RecenzijeRestoranaDTO {
    private Double prosjecnaOcjena;
    private Long ukupanBrojOcjena;
    private List<RecenzijaPrikazDTO> recenzije;
}
