package com.eatery.eaterybackend.repository;

import com.eatery.eaterybackend.entity.VrecicaIznenadjenjaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VrecicaIznenadjenjaRepository extends JpaRepository<VrecicaIznenadjenjaEntity, Long> {

    // Dohvata sve aktivne vrećice kojih ima na stanju (za Kupce na vrhu app)
    List<VrecicaIznenadjenjaEntity> findByAktivnaTrueAndKolicinaGreaterThan(Integer kolicina);

    // Dohvata sve vrećice za određeni restoran (za Restoranski panel)
    List<VrecicaIznenadjenjaEntity> findByRestoranId(Long restoranId);

    @Query("SELECT v FROM VrecicaIznenadjenjaEntity v WHERE v.restoran.id = :restoranId " +
            "AND (v.obrisana IS NULL OR v.obrisana = false)")
    List<VrecicaIznenadjenjaEntity> findVidljiveByRestoranId(@Param("restoranId") Long restoranId);
}