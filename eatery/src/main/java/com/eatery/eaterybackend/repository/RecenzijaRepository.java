package com.eatery.eaterybackend.repository;

import com.eatery.eaterybackend.entity.RecenzijaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecenzijaRepository extends JpaRepository<RecenzijaEntity, Long> {

    // Dohvati sve recenzije za restoran preko njegovog ID-a
    List<RecenzijaEntity> findByRestoranId(Long idRestorana);

    @Query("""
            SELECT AVG(r.ocjena), COUNT(r)
            FROM RecenzijaEntity r
            WHERE r.restoran.id = :idRestorana
            """)
    List<Object[]> agregirajOcjenePoRestoranu(@Param("idRestorana") Long idRestorana);

    // Provjera da li je narudžba već ocjenjena preko njenog ID-a (r.narudzba.id)
    boolean existsByNarudzbaId(Long idNarudzbe);

    @Query("""
            SELECT r FROM RecenzijaEntity r
            JOIN FETCH r.kupac
            JOIN FETCH r.restoran
            LEFT JOIN FETCH r.narudzba
            ORDER BY r.id DESC
            """)
    List<RecenzijaEntity> findAllZaAdmin();

    void deleteByKupacId(Long kupacId);

    void deleteByRestoranId(Long restoranId);

    void deleteByNarudzbaId(Long narudzbaId);
}