package com.eatery.eaterybackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "vrecica_iznenadjenja", schema = "eatery_db")
@Getter
@Setter
public class VrecicaIznenadjenjaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_vrecice")
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_restorana", referencedColumnName = "id_korisnika", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "sifra", "lozinka"})
    private KorisnikEntity restoran;

    @Column(name = "naziv", nullable = false)
    private String naziv;

    @Column(name = "opis", length = 500)
    private String opis;

    @Column(name = "originalna_cijena", nullable = false)
    private BigDecimal originalnaCijena;

    @Column(name = "akcijska_cijena", nullable = false)
    private BigDecimal akcijskaCijena;

    @Column(name = "kolicina", nullable = false)
    private Integer kolicina;

    @Column(name = "tezina_kg", precision = 10, scale = 2)
    private BigDecimal tezinaKg;

    @Column(name = "vrijeme_preuzimanja_od")
    private String vrijemePreuzimanjaOd; // npr. "20:00"

    @Column(name = "vrijeme_preuzimanja_do")
    private String vrijemePreuzimanjaDo; // npr. "21:30"

    @Column(name = "aktivna", nullable = false)
    private Boolean aktivna = true;

    @Column(name = "alergijska_upozorenja", length = 500)
    private String alergijskaUpozorenja;

    // Uklonjena vrećica se ne prikazuje nigdje, ali ostaje u bazi zbog statistike starih narudžbi
    @Column(name = "obrisana")
    private Boolean obrisana = false;

    @Column(name = "vrijeme_kreiranja")
    private LocalDateTime vrijemeKreiranja;

    @PrePersist
    protected void onCreate() {
        this.vrijemeKreiranja = LocalDateTime.now();
        if (this.aktivna == null) {
            this.aktivna = true;
        }
    }
}