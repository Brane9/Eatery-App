package com.eatery.eaterybackend.service;

import com.eatery.eaterybackend.dto.AdminKorisnikDTO;
import com.eatery.eaterybackend.dto.AdminOglasDTO;
import com.eatery.eaterybackend.dto.AdminProfilDTO;
import com.eatery.eaterybackend.dto.AdminRecenzijaDTO;
import com.eatery.eaterybackend.dto.AdminSuspenzijaDTO;
import com.eatery.eaterybackend.dto.AdminZahtjevDTO;
import com.eatery.eaterybackend.dto.RestoranOcjenaDTO;
import com.eatery.eaterybackend.entity.KlijentEntity;
import com.eatery.eaterybackend.entity.KorisnikEntity;
import com.eatery.eaterybackend.entity.KupacEntity;
import com.eatery.eaterybackend.entity.NarudzbaEntity;
import com.eatery.eaterybackend.entity.RecenzijaEntity;
import com.eatery.eaterybackend.entity.VrecicaIznenadjenjaEntity;
import com.eatery.eaterybackend.entity.ZahtjevZaAktivacijuEntity;
import com.eatery.eaterybackend.entity.ZahtjevZaPromjenuSifreEntity;
import com.eatery.eaterybackend.repository.JeloRepository;
import com.eatery.eaterybackend.repository.KategorijaRepository;
import com.eatery.eaterybackend.repository.KlijentRepository;
import com.eatery.eaterybackend.repository.KorisnikRepository;
import com.eatery.eaterybackend.repository.KupacRepository;
import com.eatery.eaterybackend.repository.NarudzbaRepository;
import com.eatery.eaterybackend.repository.RecenzijaRepository;
import com.eatery.eaterybackend.repository.StavkaNarudzbeRepository;
import com.eatery.eaterybackend.repository.VrecicaIznenadjenjaRepository;
import com.eatery.eaterybackend.repository.ZahtjevZaAktivacijuRepository;
import com.eatery.eaterybackend.repository.ZahtjevZaPromjenuSifreRepository;
import com.eatery.eaterybackend.util.SuspenzijaUtil;
import org.hibernate.proxy.HibernateProxy;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

@Service
public class AdminService {

    private final ZahtjevZaAktivacijuRepository zahtjevRepository;
    private final KorisnikRepository korisnikRepository;
    private final KupacRepository kupacRepository;
    private final KlijentRepository klijentRepository;
    private final VrecicaIznenadjenjaRepository vrecicaRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final EmailService emailService;
    private final ZahtjevZaPromjenuSifreRepository zahtjevSifraRepository;
    private final RecenzijaRepository recenzijaRepository;
    private final NarudzbaRepository narudzbaRepository;
    private final StavkaNarudzbeRepository stavkaNarudzbeRepository;
    private final JeloRepository jeloRepository;
    private final KategorijaRepository kategorijaRepository;
    private final RecenzijaService recenzijaService;

    public AdminService(ZahtjevZaAktivacijuRepository zahtjevRepository,
                        KorisnikRepository korisnikRepository,
                        KupacRepository kupacRepository,
                        KlijentRepository klijentRepository,
                        VrecicaIznenadjenjaRepository vrecicaRepository,
                        ApplicationEventPublisher eventPublisher,
                        EmailService emailService,
                        ZahtjevZaPromjenuSifreRepository zahtjevSifraRepository,
                        RecenzijaRepository recenzijaRepository,
                        NarudzbaRepository narudzbaRepository,
                        StavkaNarudzbeRepository stavkaNarudzbeRepository,
                        JeloRepository jeloRepository,
                        KategorijaRepository kategorijaRepository,
                        RecenzijaService recenzijaService) {
        this.zahtjevRepository = zahtjevRepository;
        this.korisnikRepository = korisnikRepository;
        this.kupacRepository = kupacRepository;
        this.klijentRepository = klijentRepository;
        this.vrecicaRepository = vrecicaRepository;
        this.eventPublisher = eventPublisher;
        this.emailService = emailService;
        this.zahtjevSifraRepository = zahtjevSifraRepository;
        this.recenzijaRepository = recenzijaRepository;
        this.narudzbaRepository = narudzbaRepository;
        this.stavkaNarudzbeRepository = stavkaNarudzbeRepository;
        this.jeloRepository = jeloRepository;
        this.kategorijaRepository = kategorijaRepository;
        this.recenzijaService = recenzijaService;
    }

    public void requireAdmin(Authentication authentication) {
        trenutniAdmin(authentication);
    }

    private KorisnikEntity trenutniAdmin(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalStateException("Niste autentifikovani!");
        }
        KorisnikEntity admin = unwrap(korisnikRepository.findByKorisnickoIme(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Niste autentifikovani!")));
        if (admin.getUloga() == null || !"ADMINISTRATOR".equalsIgnoreCase(admin.getUloga())) {
            throw new IllegalStateException("Samo administrator može pristupiti ovoj funkciji!");
        }
        return admin;
    }

    private LocalDateTime izracunajSuspendovanDo(AdminSuspenzijaDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Odaberite period suspenzije ili datum do kada vrijedi.");
        }
        if (dto.getSekunde() != null) {
            if (dto.getSekunde() <= 0) {
                throw new IllegalArgumentException("Broj sekundi mora biti veći od nule.");
            }
            return LocalDateTime.now().plusSeconds(dto.getSekunde());
        }
        if (dto.getSuspendovanDo() != null) {
            return dto.getSuspendovanDo();
        }
        if (dto.getDani() != null && dto.getDani() > 0) {
            return LocalDateTime.now().plusDays(dto.getDani());
        }
        throw new IllegalArgumentException("Odaberite period suspenzije ili datum do kada vrijedi.");
    }

    @Transactional(readOnly = true)
    public List<AdminZahtjevDTO> getSveZahtjeve() {
        return zahtjevRepository.findAll().stream()
                .filter(z -> {
                    KorisnikEntity k = unwrap(z.getKorisnik());
                    return k != null && "KLIJENT".equalsIgnoreCase(k.getUloga());
                })
                .sorted(Comparator.comparing(ZahtjevZaAktivacijuEntity::getDatumPodnosenja,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toZahtjevDto)
                .toList();
    }

    @Transactional
    public String obradiZahtjev(Long idZahtjeva, boolean odobreno) {
        ZahtjevZaAktivacijuEntity zahtjev = zahtjevRepository.findById(idZahtjeva)
                .orElseThrow(() -> new IllegalArgumentException("Zahtjev nije pronađen!"));

        KorisnikEntity korisnik = unwrap(zahtjev.getKorisnik());
        zahtjevRepository.delete(zahtjev);

        if (odobreno) {
            korisnik.setAktiviran(true);
            korisnikRepository.save(korisnik);
            return obavijestiOAktivaciji(korisnik);
        }

        obrisiKorisnika(korisnik);
        return "Zahtjev je odbijen i nalog je obrisan!";
    }

    @Transactional
    public String aktivirajKorisnika(Long id) {
        KorisnikEntity korisnik = unwrap(korisnikRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Korisnik nije pronađen!")));

        if (!"KLIJENT".equalsIgnoreCase(korisnik.getUloga())) {
            throw new IllegalStateException("Aktivacija je potrebna samo za restorane!");
        }

        boolean vecAktiviran = Boolean.TRUE.equals(korisnik.getAktiviran());
        korisnik.setAktiviran(true);
        korisnikRepository.save(korisnik);
        zahtjevRepository.findByKorisnikId(id).ifPresent(zahtjevRepository::delete);
        return vecAktiviran ? "Nalog je već aktiviran." : obavijestiOAktivaciji(korisnik);
    }

    private String obavijestiOAktivaciji(KorisnikEntity korisnik) {
        String naziv = korisnik instanceof KlijentEntity klijent ? klijent.getNazivObjekta() : null;
        eventPublisher.publishEvent(new EmailService.NalogAktiviran(
                korisnik.getEmail(), korisnik.getKorisnickoIme(), naziv));
        return "Nalog je uspješno aktiviran!" + dodatakOEmailu(korisnik);
    }

    private String dodatakOEmailu(KorisnikEntity korisnik) {
        if (emailService.jeKonfigurisan() && korisnik.getEmail() != null && !korisnik.getEmail().isBlank()) {
            return " Obavještenje se šalje na " + korisnik.getEmail() + ".";
        }
        return "";
    }

    private void nakonCommit(Runnable akcija) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    akcija.run();
                }
            });
            return;
        }
        akcija.run();
    }

    @Transactional(readOnly = true)
    public List<AdminZahtjevDTO> getZahtjeveZaPromjenuSifre() {
        return zahtjevSifraRepository.findAll().stream()
                .sorted(Comparator.comparing(ZahtjevZaPromjenuSifreEntity::getDatumPodnosenja,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toZahtjevSifraDto)
                .toList();
    }

    @Transactional
    public String obradiZahtjevZaPromjenuSifre(Long idZahtjeva, boolean odobreno) {
        ZahtjevZaPromjenuSifreEntity zahtjev = zahtjevSifraRepository.findById(idZahtjeva)
                .orElseThrow(() -> new IllegalArgumentException("Zahtjev nije pronađen!"));

        KorisnikEntity korisnik = unwrap(zahtjev.getKorisnik());
        zahtjevSifraRepository.delete(zahtjev);

        if (odobreno) {
            korisnik.setSifra(zahtjev.getNovaSifra());
            korisnikRepository.save(korisnik);
        }

        eventPublisher.publishEvent(new EmailService.SifraObradjena(
                korisnik.getEmail(), korisnik.getKorisnickoIme(), odobreno));

        String poruka = odobreno
                ? "Šifra za korisnika " + korisnik.getKorisnickoIme() + " je promijenjena."
                : "Zahtjev za promjenu šifre korisnika " + korisnik.getKorisnickoIme() + " je odbijen.";
        if (emailService.jeKonfigurisan() && korisnik.getEmail() != null && !korisnik.getEmail().isBlank()) {
            poruka += " Obavještenje se šalje na " + korisnik.getEmail() + ".";
        }
        return poruka;
    }

    @Transactional
    public String suspendujKorisnika(Long id, AdminSuspenzijaDTO dto, Authentication authentication) {
        KorisnikEntity admin = trenutniAdmin(authentication);
        KorisnikEntity korisnik = unwrap(korisnikRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Korisnik nije pronađen!")));

        if (admin.getId() != null && admin.getId().equals(korisnik.getId())) {
            throw new IllegalStateException("Ne možete suspendovati vlastiti nalog!");
        }
        if ("ADMINISTRATOR".equalsIgnoreCase(korisnik.getUloga())) {
            throw new IllegalStateException("Administrator ne može biti suspendovan!");
        }
        if (!"KUPAC".equalsIgnoreCase(korisnik.getUloga())
                && !"KLIJENT".equalsIgnoreCase(korisnik.getUloga())) {
            throw new IllegalStateException("Suspenzija je dostupna samo za kupce i restorane!");
        }

        LocalDateTime doKad = izracunajSuspendovanDo(dto);
        if (!doKad.isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("Suspenzija mora trajati do datuma u budućnosti!");
        }

        SuspenzijaUtil.primijeni(korisnik, doKad);
        korisnikRepository.save(korisnik);

        String doKadTekst = doKad.format(SuspenzijaUtil.FORMAT);
        EmailService.NalogSuspendovan email = new EmailService.NalogSuspendovan(
                korisnik.getEmail(),
                korisnik.getKorisnickoIme(),
                imeKorisnika(korisnik),
                korisnik.getUloga(),
                doKadTekst);
        nakonCommit(() -> emailService.obavijestiOSuspenziji(email));

        String poruka = "Nalog je suspendovan do " + doKadTekst + ".";
        return poruka + dodatakOEmailu(korisnik);
    }

    @Transactional
    public String skiniSuspenziju(Long id, Authentication authentication) {
        trenutniAdmin(authentication);
        KorisnikEntity korisnik = unwrap(korisnikRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Korisnik nije pronađen!")));

        if ("ADMINISTRATOR".equalsIgnoreCase(korisnik.getUloga())) {
            throw new IllegalStateException("Administrator ne može biti suspendovan!");
        }

        SuspenzijaUtil.skini(korisnik);
        korisnikRepository.save(korisnik);

        EmailService.NalogSuspenzijaSkinuta email = new EmailService.NalogSuspenzijaSkinuta(
                korisnik.getEmail(),
                korisnik.getKorisnickoIme(),
                imeKorisnika(korisnik),
                korisnik.getUloga());
        nakonCommit(() -> emailService.obavijestiOSkidanjuSuspenzije(email));

        return "Suspenzija je uklonjena. Korisnik se može ponovo prijaviti." + dodatakOEmailu(korisnik);
    }

    @Transactional(readOnly = true)
    public List<AdminKorisnikDTO> getKupce(String q, Boolean aktiviran, Boolean suspendovan, String sort, String dir) {
        Map<Long, AdminKorisnikDTO> poId = new LinkedHashMap<>();
        for (KupacEntity kupac : kupacRepository.findAll()) {
            poId.put(kupac.getId(), toKorisnikDto(kupac));
        }
        for (KorisnikEntity korisnik : korisnikRepository.findAll()) {
            KorisnikEntity k = unwrap(korisnik);
            if (k == null || k.getId() == null || k.getUloga() == null
                    || !"KUPAC".equalsIgnoreCase(k.getUloga())) {
                continue;
            }
            poId.putIfAbsent(k.getId(), toKorisnikDto(k));
        }
        return filterSort(poId.values().stream(), q, aktiviran, suspendovan, sort, dir);
    }

    @Transactional(readOnly = true)
    public List<AdminKorisnikDTO> getKlijente(String q, Boolean aktiviran, Boolean suspendovan, String sort, String dir) {
        return filterSort(klijentRepository.findAll().stream().map(this::toKorisnikDto), q, aktiviran, suspendovan, sort, dir);
    }

    @Transactional(readOnly = true)
    public List<AdminOglasDTO> getOglase() {
        return vrecicaRepository.findAll().stream()
                .sorted(Comparator.comparing(VrecicaIznenadjenjaEntity::getId).reversed())
                .map(this::toOglasDto)
                .toList();
    }

    @Transactional
    public String obrisiOglas(Long id) {
        VrecicaIznenadjenjaEntity oglas = vrecicaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Oglas nije pronađen!"));
        vrecicaRepository.delete(oglas);
        return "Oglas je uspješno obrisan.";
    }

    @Transactional(readOnly = true)
    public AdminProfilDTO getProfil(Long id) {
        KorisnikEntity korisnik = unwrap(korisnikRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Korisnik nije pronađen!")));
        if ("ADMINISTRATOR".equalsIgnoreCase(korisnik.getUloga())) {
            throw new IllegalStateException("Profil administratora nije dostupan ovdje.");
        }

        AdminKorisnikDTO osnovno = toKorisnikDto(korisnik);
        AdminProfilDTO dto = new AdminProfilDTO();
        dto.setId(osnovno.getId());
        dto.setKorisnickoIme(osnovno.getKorisnickoIme());
        dto.setEmail(osnovno.getEmail());
        dto.setUloga(osnovno.getUloga());
        dto.setAktiviran(osnovno.getAktiviran());
        dto.setPrikazIme(osnovno.getPrikazIme());
        dto.setAdresa(osnovno.getAdresa());
        dto.setSuspendovan(osnovno.getSuspendovan());
        dto.setSuspendovanDo(osnovno.getSuspendovanDo());

        if (korisnik instanceof KupacEntity kupac) {
            dto.setIme(kupac.getIme());
            dto.setCestiKupac(kupac.getCestiKupac());
            dto.setPopust(kupac.getPopust());
            dto.setUkupnoNarudzbi((long) narudzbaRepository.findByKupacId(id).size());
            Long vrecice = narudzbaRepository.prebrojVrecicePoKupcu(id);
            dto.setUkupnoVrecica(vrecice != null ? vrecice : 0L);
            BigDecimal usteda = narudzbaRepository.izracunajUsteduPoKupcu(id);
            dto.setUkupnaUstedaKM(usteda != null ? usteda : BigDecimal.ZERO);
        } else if (korisnik instanceof KlijentEntity klijent) {
            dto.setNazivObjekta(klijent.getNazivObjekta());
            dto.setAdresa(klijent.getAdresa());
            dto.setLat(klijent.getLat());
            dto.setLng(klijent.getLng());
            dto.setRadnoVrijemeOd(klijent.getRadnoVrijemeOd());
            dto.setRadnoVrijemeDo(klijent.getRadnoVrijemeDo());
            dto.setUkupnoNarudzbi((long) narudzbaRepository.findByRestoranId(id).size());
            dto.setBrojJela((long) jeloRepository.findByRestoranId(id).size());
            dto.setBrojOglasa((long) vrecicaRepository.findByRestoranId(id).size());
            RestoranOcjenaDTO ocjena = recenzijaService.ocjenaZaRestoran(id);
            dto.setProsjecnaOcjena(ocjena.getProsjecnaOcjena());
            dto.setUkupanBrojOcjena(ocjena.getUkupanBrojOcjena());
        }

        return dto;
    }

    @Transactional
    public String obrisiNalog(Long id, Authentication authentication) {
        KorisnikEntity admin = trenutniAdmin(authentication);
        KorisnikEntity korisnik = unwrap(korisnikRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Korisnik nije pronađen!")));

        if (admin.getId() != null && admin.getId().equals(korisnik.getId())) {
            throw new IllegalStateException("Ne možete obrisati vlastiti nalog!");
        }
        if ("ADMINISTRATOR".equalsIgnoreCase(korisnik.getUloga())) {
            throw new IllegalStateException("Administrator ne može biti obrisan!");
        }
        if (!"KUPAC".equalsIgnoreCase(korisnik.getUloga())
                && !"KLIJENT".equalsIgnoreCase(korisnik.getUloga())) {
            throw new IllegalStateException("Brisanje je dostupno samo za kupce i restorane!");
        }

        String ime = korisnik.getKorisnickoIme();
        String adresa = korisnik.getEmail();
        EmailService.NalogObrisan email = new EmailService.NalogObrisan(
                adresa, ime, imeKorisnika(korisnik), korisnik.getUloga());
        obrisiKorisnika(korisnik);
        nakonCommit(() -> emailService.obavijestiOBrisanju(email));

        String poruka = "Nalog \"" + ime + "\" je uspješno obrisan.";
        if (emailService.jeKonfigurisan() && adresa != null && !adresa.isBlank()) {
            poruka += " Obavještenje se šalje na " + adresa + ".";
        }
        return poruka;
    }

    @Transactional(readOnly = true)
    public List<AdminRecenzijaDTO> getRecenzije() {
        return recenzijaRepository.findAllZaAdmin().stream()
                .map(this::toRecenzijaDto)
                .toList();
    }

    @Transactional
    public String obrisiRecenziju(Long id) {
        RecenzijaEntity recenzija = recenzijaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recenzija nije pronađena!"));
        recenzijaRepository.delete(recenzija);
        return "Recenzija je uspješno obrisana.";
    }

    private List<AdminKorisnikDTO> filterSort(Stream<AdminKorisnikDTO> stream,
                                              String q,
                                              Boolean aktiviran,
                                              Boolean suspendovan,
                                              String sort,
                                              String dir) {
        String query = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        String sortField = sort == null || sort.isBlank() ? "id" : sort.trim();
        boolean ascending = dir == null || !"desc".equalsIgnoreCase(dir.trim());

        Stream<AdminKorisnikDTO> filtered = stream
                .filter(k -> aktiviran == null || aktiviran.equals(k.getAktiviran()))
                .filter(k -> suspendovan == null || suspendovan.equals(Boolean.TRUE.equals(k.getSuspendovan())))
                .filter(k -> query.isEmpty() || matchesSearch(k, query));

        Comparator<AdminKorisnikDTO> comparator = comparatorFor(sortField);
        if (!ascending) {
            comparator = comparator.reversed();
        }

        return filtered.sorted(comparator).toList();
    }

    private boolean matchesSearch(AdminKorisnikDTO k, String query) {
        return contains(k.getKorisnickoIme(), query)
                || contains(k.getEmail(), query)
                || contains(k.getPrikazIme(), query)
                || contains(k.getAdresa(), query);
    }

    private boolean contains(String value, String query) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(query);
    }

    private boolean imaTekst(String value) {
        return value != null && !value.isBlank();
    }

    private Comparator<AdminKorisnikDTO> comparatorFor(String sortField) {
        return switch (sortField) {
            case "korisnickoIme" -> Comparator.comparing(AdminKorisnikDTO::getKorisnickoIme, this::compareText);
            case "email" -> Comparator.comparing(AdminKorisnikDTO::getEmail, this::compareText);
            case "uloga" -> Comparator.comparing(AdminKorisnikDTO::getUloga, this::compareText);
            case "aktiviran" -> Comparator.comparing(k -> Boolean.TRUE.equals(k.getAktiviran()));
            case "prikazIme" -> Comparator.comparing(AdminKorisnikDTO::getPrikazIme, this::compareText);
            case "adresa" -> Comparator.comparing(AdminKorisnikDTO::getAdresa, this::compareText);
            default -> Comparator.comparing(AdminKorisnikDTO::getId, Comparator.nullsLast(Long::compareTo));
        };
    }

    private int compareText(String a, String b) {
        return Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER).compare(a, b);
    }

    private void obrisiKorisnika(KorisnikEntity korisnik) {
        Long id = korisnik.getId();
        obrisiPovezanePodatke(id);
        if (korisnik instanceof KupacEntity kupac) {
            kupacRepository.delete(kupac);
        } else if (korisnik instanceof KlijentEntity klijent) {
            klijentRepository.delete(klijent);
        } else {
            korisnikRepository.delete(korisnik);
        }
    }

    private void obrisiPovezanePodatke(Long korisnikId) {
        recenzijaRepository.deleteByKupacId(korisnikId);
        recenzijaRepository.deleteByRestoranId(korisnikId);

        Set<Long> narudzbaIds = new LinkedHashSet<>();
        List<NarudzbaEntity> narudzbe = new ArrayList<>();
        narudzbe.addAll(narudzbaRepository.findByKupacId(korisnikId));
        narudzbe.addAll(narudzbaRepository.findByRestoranId(korisnikId));
        for (NarudzbaEntity n : narudzbe) {
            if (n.getId() != null && narudzbaIds.add(n.getId())) {
                recenzijaRepository.deleteByNarudzbaId(n.getId());
                stavkaNarudzbeRepository.deleteAll(stavkaNarudzbeRepository.findByIdNarudzbe(n.getId()));
            }
        }
        if (!narudzbaIds.isEmpty()) {
            narudzbaRepository.deleteAllById(narudzbaIds);
        }

        vrecicaRepository.deleteAll(vrecicaRepository.findByRestoranId(korisnikId));
        jeloRepository.deleteAll(jeloRepository.findByRestoranId(korisnikId));
        kategorijaRepository.deleteAll(kategorijaRepository.findByRestoranId(korisnikId));
        zahtjevRepository.findByKorisnikId(korisnikId).ifPresent(zahtjevRepository::delete);
        zahtjevSifraRepository.findByKorisnikId(korisnikId).ifPresent(zahtjevSifraRepository::delete);
    }

    private AdminRecenzijaDTO toRecenzijaDto(RecenzijaEntity r) {
        AdminRecenzijaDTO dto = new AdminRecenzijaDTO();
        dto.setId(r.getId());
        dto.setOcjena(r.getOcjena());
        dto.setKomentar(r.getKomentar());
        dto.setDatumKreiranja(r.getDatumKreiranja());
        KorisnikEntity kupac = unwrap(r.getKupac());
        if (kupac != null) {
            dto.setKupacId(kupac.getId());
            dto.setKupac(imeKorisnika(kupac));
        }
        KorisnikEntity restoran = unwrap(r.getRestoran());
        if (restoran != null) {
            dto.setRestoranId(restoran.getId());
            dto.setRestoran(imeKorisnika(restoran));
        }
        if (r.getNarudzba() != null) {
            dto.setNarudzbaId(r.getNarudzba().getId());
            dto.setSifraNarudzbe(r.getNarudzba().getSifra());
        }
        return dto;
    }

    private String imeKorisnika(KorisnikEntity k) {
        k = unwrap(k);
        if (k instanceof KupacEntity kupac && imaTekst(kupac.getIme())) {
            return kupac.getIme();
        }
        if (k instanceof KlijentEntity klijent && imaTekst(klijent.getNazivObjekta())) {
            return klijent.getNazivObjekta();
        }
        return k.getKorisnickoIme();
    }

    private AdminZahtjevDTO toZahtjevDto(ZahtjevZaAktivacijuEntity zahtjev) {
        return toZahtjevDto(zahtjev.getId(), zahtjev.getKorisnik(), zahtjev.getDatumPodnosenja());
    }

    private AdminZahtjevDTO toZahtjevSifraDto(ZahtjevZaPromjenuSifreEntity zahtjev) {
        return toZahtjevDto(zahtjev.getId(), zahtjev.getKorisnik(), zahtjev.getDatumPodnosenja());
    }

    private AdminZahtjevDTO toZahtjevDto(Long id, KorisnikEntity k, LocalDateTime datumPodnosenja) {
        AdminKorisnikDTO korisnik = k == null ? null : toKorisnikDto(k);
        AdminZahtjevDTO dto = new AdminZahtjevDTO();
        dto.setId(id);
        dto.setDatumPodnosenja(datumPodnosenja);
        if (korisnik != null) {
            dto.setKorisnikId(korisnik.getId());
            dto.setKorisnickoIme(korisnik.getKorisnickoIme());
            dto.setEmail(korisnik.getEmail());
            dto.setUloga(korisnik.getUloga());
            dto.setPrikazIme(korisnik.getPrikazIme());
            dto.setSuspendovan(korisnik.getSuspendovan());
            dto.setSuspendovanDo(korisnik.getSuspendovanDo());
        }
        return dto;
    }

    private AdminKorisnikDTO toKorisnikDto(KorisnikEntity k) {
        k = unwrap(k);
        AdminKorisnikDTO dto = new AdminKorisnikDTO();
        dto.setId(k.getId());
        dto.setKorisnickoIme(k.getKorisnickoIme());
        dto.setEmail(k.getEmail());
        dto.setUloga(k.getUloga());
        dto.setAktiviran(k.getAktiviran());
        boolean aktivnaSuspenzija = SuspenzijaUtil.jeAktivna(k);
        dto.setSuspendovan(aktivnaSuspenzija);
        dto.setSuspendovanDo(aktivnaSuspenzija ? k.getSuspendovanDo() : null);
        if (k instanceof KupacEntity kupac) {
            dto.setPrikazIme(imaTekst(kupac.getIme()) ? kupac.getIme() : k.getKorisnickoIme());
        } else if (k instanceof KlijentEntity klijent) {
            dto.setPrikazIme(klijent.getNazivObjekta());
            dto.setAdresa(klijent.getAdresa());
        } else if ("KUPAC".equalsIgnoreCase(k.getUloga())) {
            dto.setPrikazIme(k.getKorisnickoIme());
        } else {
            dto.setPrikazIme("Administrator");
        }
        return dto;
    }

    private AdminOglasDTO toOglasDto(VrecicaIznenadjenjaEntity v) {
        AdminOglasDTO dto = new AdminOglasDTO();
        dto.setId(v.getId());
        dto.setNaziv(v.getNaziv());
        dto.setOpis(v.getOpis());
        dto.setOriginalnaCijena(v.getOriginalnaCijena());
        dto.setAkcijskaCijena(v.getAkcijskaCijena());
        dto.setKolicina(v.getKolicina());
        dto.setAktivna(v.getAktivna());
        dto.setVrijemePreuzimanjaOd(v.getVrijemePreuzimanjaOd());
        dto.setVrijemePreuzimanjaDo(v.getVrijemePreuzimanjaDo());
        dto.setVrijemeKreiranja(v.getVrijemeKreiranja());
        if (v.getRestoran() != null) {
            KorisnikEntity restoran = unwrap(v.getRestoran());
            dto.setRestoranId(restoran.getId());
            if (restoran instanceof KlijentEntity klijent && klijent.getNazivObjekta() != null) {
                dto.setRestoran(klijent.getNazivObjekta());
            } else {
                dto.setRestoran(restoran.getKorisnickoIme());
            }
        }
        return dto;
    }

    @SuppressWarnings("unchecked")
    private <T> T unwrap(T entity) {
        if (entity instanceof HibernateProxy proxy) {
            return (T) proxy.getHibernateLazyInitializer().getImplementation();
        }
        return entity;
    }
}
