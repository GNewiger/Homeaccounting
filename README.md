# Homeaccounting
Homeaccounting ist eine Webanwendung für das Verwalten von Ein- und Ausgaben im privaten Haushalt mithilfe von dem Prinzip des "Buchens" wie man es aus einer Ausbildung als Kauffrau/-mann für Büromanagement kennt. Das Projekt ist hauptsächlich als Lernprojekt gedacht, insbesondere hat es einen starken Fokus auf die Postgres Datenbank: Ich wollte in diesem Projekt verproben, welche Herausforderungen und Chancen sich ergeben, wenn man die Anwendungslogik mithilfe von Stored Procedures vom Backend Server in die Datenbank verlagert. Meine Ergebnisse und Erkenntnisse präsentiere ich weiter unten in dieser README. \
**Wichtig**: Ich rate zum jetzigen Zeitpunkt vom produktiven Gebrauch der Anwendung ab. Die Anwendung wurde nicht auf Cypersecurity oder Robustheit geprüft. Desweiteren übernehme ich keine Haftung und biete keine Garantie. Falls Du das Projekt unterstützen und zu einem vollwertigen Produkt ausbauen möchtest, setze Dich gerne mit mir in Verbindung!
## Requirements
- docker
- docker compose

## Build & Start
Umgebungsvariablen setzen:
| Umgebungsvariable          | Beispiel       | Anmerkung |
| -------------------------- | -------------  | --------- |
| HOMEACCOUNTING_HOSTNAME    | 192.168.178.23 | IP des Servers.                                                                                                              |
| HOMEACCOUNTING_PORT        | 3000           | Möchtest du Homeaccounting über andere Geräte im Wlan nutzen (z.B. Smartphone Browser), vergiss nicht diesen Port zu öffnen. |
| DATABASE_PASSWORD          | postgres       | Für Prod sollte natürlich ein sicheres Passwort verwendet werden und zugriffsgeschützt abgelegt werden .                     |
| HOMEACCOUNTING_ALLOW_TESTS | true           | (De-)aktiviert den Endpunkt `/unit-test`. Ich finde ihn praktisch zum Debuggen, in Prod sollte er ausgeschaltet sein.        |

Starten mit:\
`docker compose up`

## Projektstruktur
- Vanilla NodeJS HTTP Servers als Frontend.
- Single-Page Client-Side Rendering.
- Vanilla NodeJS REST API als Backend.
- Die meiste Logik liegt in der Datenbank in Form von Stored Procedures.

## Verlagerung der Anwendungslogik vom Backend in die Datenbank
Die Grundidee ist, mithilfe von Stored Procedures die Anwendungslogik als (PLpg)SQL in der Datenbank abzubilden. Beispiel:\
In der Buchhaltung gibt es das Konzept des "Splittings". Wollen wir also z.B. eine Paypal Abrechnung mit mehreren verschiedenen Artikeln buchen, können wir diese Rechnung als einzelne Buchung verarbeiten. Angenommen die Paypal Rechnung umfasste folgende Artikel:
| Artikel                  | Preis  |
| ------------------------ | ------ |
| Kinderschuhe             | 30,00€ |
| Hundebürste              | 10,00€ |
| Zelda Breath of the Wild | 50,00€ |

Und angenommen wir haben für diese drei Artikel jeweils ein eigenes, passendes Buchhaltungskonto: Kind, Hund und Freizeit.\
Desweiteren haben wir ein Bankkonto.\
Dann könnte das Splitten der Rechnung wie folgt aussehen:\
- Wir buchen 30,00€ auf Soll von Konto 'Kind'
- Wir buchen 10,00€ auf Soll von Konto 'Hund'
- Wir buchen 50,00€ auf Soll von Konto 'Freizeit'
- Wir buchen 90,00€ auf Haben von Konto 'Bankkonto'

Die Buchung bilden wir (vereinfacht) wie folgt in den Datenbanktabellen ab:\
Tabelle Buchung
| ID | Quellkonto | Quellkonto Soll oder Haben? |
| -- | ---------- | --------------------------- |
| 1  | Bankkonto  | Haben                       |

Tabelle Buchung_target
| Zielkonto | Buchung ID    | Betrag |
| --------- | ------------- | ------ |
| Kind      | 1             | 30,00€ |
| Hund      | 1             | 10,00€ |
| Freizeit  | 1             | 50,00€ |

Tabelle Saldo
| Konto     | Soll   | Haben  | Zeitpunkt        |
| --------- | ------ | ------ | ---------------- |
| Bankkonto | 0      | 0      | 2025-01-09 08:41 |
| Kind      | 0      | 0      | 2025-01-09 08:41 |
| Hund      | 0      | 0      | 2025-01-09 08:41 |
| Freizeit  | 0      | 0      | 2025-01-09 08:41 |
| Bankkonto | 0      | 90,00€ | 2025-01-10 10:30 |
| Kind      | 30,00€ | 0      | 2025-01-10 10:30 |
| Hund      | 10,00€ | 0      | 2025-01-10 10:30 |
| Freizeit  | 50,00€ | 0      | 2025-01-10 10:30 |

Dieses Splitting können wir programmatisch auf zwei Arten erreichen.
### Splitting im Backend
Mithile von Object Relational Mapping (ORM) - z.B. mit Hibernate - können wir den Vorgang des Buchens in etwa wie folgt erfassen (Achtung, von ChatGPT generiert):
```
 @Transactional
    public void buchen(Short sourceKontoId, Boolean sourceKontoIsOnHabenSide, Timestamp timeOfTransfer,
                        String sourceDescription, List<TargetKontoSplit> targetKontoSplitArr) {
        // Schritt 1: Berechne den Gesamtbetrag
        int totalAmount = 0;
        for (TargetKontoSplit split : targetKontoSplitArr) {
            totalAmount += split.getAmountInCents();
        }

        // Schritt 2: Erstelle eine neue Buchung
        Buchung buchung = new Buchung();
        buchung.setAmountInCents(totalAmount);
        buchung.setSourceKonto(getKontoById(sourceKontoId));
        buchung.setSourceKontoIsOnHabenSide(sourceKontoIsOnHabenSide);
        buchung.setDescription(sourceDescription);
        buchung.setTimeOfTransfer(timeOfTransfer);

        entityManager.persist(buchung);

        // Schritt 3: Aktualisiere das Saldo für das Quellkonto
        updateSaldo(sourceKontoId, totalAmount, sourceKontoIsOnHabenSide, timeOfTransfer);

        // Schritt 4: Erstelle Buchung-Targets und aktualisiere Saldo für jedes Zielkonto
        for (TargetKontoSplit split : targetKontoSplitArr) {
            BuchungTarget buchungTarget = new BuchungTarget();
            buchungTarget.setBuchung(buchung);
            buchungTarget.setAmountInCents(split.getAmountInCents());
            buchungTarget.setTargetKonto(getKontoById(split.getKontoId()));
            buchungTarget.setDescription(split.getDescription());

            entityManager.persist(buchungTarget);

            // Saldo für das Zielkonto aktualisieren
            updateSaldo(split.getKontoId(), split.getAmountInCents(), !sourceKontoIsOnHabenSide, timeOfTransfer);
        }
    }
    
    private void updateSaldo(Short kontoId, int amountInCents, boolean isHabenSide, Timestamp timeOfTransfer) {
        // Finde das neueste Saldo für das Konto
        Query query = entityManager.createQuery("SELECT s FROM Saldo s WHERE s.konto.id = :kontoId ORDER BY s.pointInTime DESC");
        query.setParameter("kontoId", kontoId);
        query.setMaxResults(1);

        Saldo latestSaldo = (Saldo) query.getSingleResult();

        // Berechne den neuen Saldo
        Saldo newSaldo = new Saldo();
        newSaldo.setKonto(latestSaldo.getKonto());
        newSaldo.setPointInTime(timeOfTransfer);
        if (isHabenSide) {
            newSaldo.setHabenInCents(latestSaldo.getHabenInCents() + amountInCents);
            newSaldo.setSollInCents(latestSaldo.getSollInCents());
        } else {
            newSaldo.setSollInCents(latestSaldo.getSollInCents() + amountInCents);
            newSaldo.setHabenInCents(latestSaldo.getHabenInCents());
        }

        entityManager.persist(newSaldo);
    }
```
Dieser Ansatz zeigt:
- Einfache Queries zum Abfragen der Daten
- Berechnung der neuen Werte und Erstellen der neuen Datensätze
- Generierte Queries zum Update der Datenbank

Zum Unit-Testen könnte man den Code in testbarere Funktionen aufteilen und mithilfe eines Test-Frameworks ausführen. Alternativ kann man gegen die Datenbank testen und weitere Queries absetzen, um den Datenstand vorher und hinterher abzugleichen.
### Splitting in der Datenbank
Ausschnitt aus init.sql:
```
create or replace procedure buchen(
    source_konto_id smallint, 
    source_konto_is_on_haben_side boolean,
    time_of_transfer timestamp,
    source_description varchar(100),
    variadic target_konto_split_arr target_konto_split[]
    ) as $$
declare
    buchung_id integer;
    total integer := 0;
    split_buchung target_konto_split;
begin
    select sum(amount_in_cents) into total from unnest(target_konto_split_arr) as targets(konto_id, amount_in_cents, description);
    insert into buchung(amount_in_cents, source_konto, source_konto_is_on_haben_side, description, time_of_transfer) 
	    values (total, source_konto_id, source_konto_is_on_haben_side, source_description, time_of_transfer) returning id into buchung_id;
	-- Saldo anpassen
	insert into saldo(konto, point_in_time, haben_in_cents, soll_in_cents)
	with latest as
	(
		select max(point_in_time) as point_in_time from saldo group by konto having konto = source_konto_id
	)
	-- small trick to avoid if-else construct: multiply source_konto_is_on_haben_side (as 0 or 1) to amount in order to implement a kind of toggle
	select source_konto_id, time_of_transfer, 
	    haben_in_cents + (source_konto_is_on_haben_side::integer * total), 
	    soll_in_cents + ((not source_konto_is_on_haben_side)::integer * total)
	from saldo join latest using(point_in_time)
	where konto = source_konto_id;

    insert into buchung_target(buchung_id, amount_in_cents, target_konto, description)   
		select buchung_id, amount_in_cents, konto_id as target_konto, description 
		from unnest(array [
				row(2, to_number('2000,00', '9999G99'), 'für vorzeitige Rückzahlung')::target_konto_split,
				row(3, to_number('1000,00', '9999G99'), '')::target_konto_split
			]::target_konto_split[]);

		insert into saldo(konto, point_in_time, haben_in_cents, soll_in_cents)
		with latest as
		(
			select max(point_in_time) as point_in_time from saldo group by konto having konto = split_buchung.konto_id
		)
		-- small trick to avoid if-else construct: multiply source_konto_is_on_haben_side (as 0 or 1) to amount in order to implement a kind of toggle
		select split_buchung.konto_id, time_of_transfer, 
		    haben_in_cents + (source_konto_is_on_haben_side::integer * split_buchung.amount_in_cents), 
		    soll_in_cents + ((not source_konto_is_on_haben_side)::integer * split_buchung.amount_in_cents)
		from saldo join latest using(point_in_time)
		where konto = split_buchung.konto_id;
end;
$$ language plpgsql;
```
Bemerkenswert ist, dass SQL mehrere Features bietet, um die komplexe Berechnungslogik ohne Loops und if-else Konstrukte abzubilden:
- Common Table Expressions (CTEs)
- Joins
- Aggregationen
- Umgang mit arrays (unnest)
- Window Functions (brauchten wir hier nicht)

Auch Tests können als Stored Procedures abgebildet werden. Die Tests bestehen dann aus einem einfachen Ausführen des SQL Skripts und somit  können wir die gesamte Unit-Test-Strecke an einer einzelnen Stelle abbilden - in der Datenbank:
1. Testvorbedingungen schaffen / Testdaten anlegen
2. Testobjekt (SQL Code) ausführen
3. Vergleich von Ist und Soll
4. Ergebnisse sammeln und in einem Bericht zusammenfassen

Die einzelnen Schritte möchte ich anhand von Ausschnitten aus der unit-test.sql verdeutlichen:
1. Testvorbedingungen schaffen
```
create or replace procedure test_buchen_source_haben()
language plpgsql
as $$
begin
    truncate buchung cascade;
    truncate buchung_target cascade;
    ...
end$$;

-- general setup
truncate konto restart identity cascade;

create table if not exists test_result(
	test_suite	varchar(50),
	test_name 	varchar(50),
	passed 		boolean,
	primary key (test_suite, test_name)
);

create table if not exists test_error(
	test_suite  	varchar(50),
	test_name   	varchar(50),
	error_message	varchar(250),
	primary key (test_suite, test_name, error_message),
	FOREIGN KEY (test_suite, test_name) REFERENCES test_result(test_suite, test_name)
);

truncate test_result cascade;
truncate test_error cascade;

call create_konto('Gehalt'::varchar, null, clock_timestamp()::timestamp);
call create_konto('Bafoeg'::varchar, null, clock_timestamp()::timestamp);
call create_konto('Sparen'::varchar, null, clock_timestamp()::timestamp);

call test_buchen_source_haben();
call test_buchen_source_soll();
...
```
2. Testobjekt (SQL Code) ausführen
```
create or replace procedure test_buchen_source_haben()
language plpgsql
as $$
begin
    ...
    call buchen(1::smallint, true, clock_timestamp()::timestamp, 'Guilians Gehalt'::varchar,
	row(2, to_number('2000,00', '9999G99'), 'für vorzeitige Rückzahlung')::target_konto_split,
	row(3, to_number('1000,00', '9999G99'), '')::target_konto_split);
    ...
end$$;

create or replace procedure test_buchen_source_soll()
language plpgsql
as $$
begin
    ...
    call buchen(1::smallint, false, clock_timestamp()::timestamp, 'Guilians Gehalt'::varchar,
	row(2, to_number('2000,00', '9999G99'), 'für vorzeitige Rückzahlung')::target_konto_split);
    ...
end$$;

...
call test_buchen_source_haben();
call test_buchen_source_soll();
...
```
3. Vergleich von Ist und Soll
```
create or replace procedure test_buchen_source_haben()
language plpgsql
as $$
begin
    ...
    with only_one_buchung as (
        select 'only_one_buchung' as name, 
            count(*) != 1 as is_error, 
            'Expected count of buchung to be 1, actual: ' || count(*) as error_message from buchung
    ),
    source_has_right_amount as (
        select 'source_has_right_amount' as name, 
            amount_in_cents != to_number('3000,00', '9999G99') as is_error, 
            'Expected amount to be 3000,00€, actual: ' || to_char(amount_in_cents, 'FM99999999G99L') as error_message from buchung
    ),
    source_is_haben as (
        select 'source_is_haben' as name, 
            not source_konto_is_on_haben_side as is_error, 
            'Expected source buchung to be haben, actual: soll' as error_message from buchung
    ),
    ...
end$$;

create or replace procedure test_buchen_source_soll()
language plpgsql
as $$
begin
    ...
    with target_has_right_amount as (
        select 'target_has_right_amount' as name, 
            amount_in_cents != to_number('2000,00', '9999G99') as is_error, 
            'Expected amount to be 2000,00€, actual: ' || to_char(amount_in_cents, 'FM99999999G99L') as error_message from buchung
    ),
    source_is_soll as (
        select 'source_is_soll' as name, 
            source_konto_is_on_haben_side as is_error, 
            'Expected source buchung to be soll, actual: haben' as error_message from buchung
    ),
    ...
end$$;
...
```
4. Ergebnisse sammeln und in einem Bericht zusammenfassen
```
create or replace procedure test_buchen_source_haben()
language plpgsql
as $$
begin
    ...
    result as (
        insert into test_result(test_suite, test_name, passed)
        select 'test_buchen_source_haben', name, not is_error from only_one_buchung
        union all
        select 'test_buchen_source_haben', name, not is_error from source_has_right_amount
        union all
        select 'test_buchen_source_haben', name, not is_error from source_is_haben
    )
    insert into test_error(test_suite, test_name, error_message)
        select 'test_buchen_source_haben', name, error_message from only_one_buchung where is_error
        union all
        select 'test_buchen_source_haben', name, error_message from source_has_right_amount where is_error
        union all
        select 'test_buchen_source_haben', name, error_message from source_is_haben where is_error;
end$$;

create or replace procedure test_buchen_source_soll()
language plpgsql
as $$
begin
    ...    
    result as (
        insert into test_result(test_suite, test_name, passed)
        select 'test_buchen_source_soll', name, not is_error from target_has_right_amount
        union all
        select 'test_buchen_source_soll', name, not is_error from source_is_soll
    )
    insert into test_error(test_suite, test_name, error_message)
        select 'test_buchen_source_soll', name, error_message from target_has_right_amount where is_error
        union all
        select 'test_buchen_source_soll', name, error_message from source_is_soll where is_error;
end$$;
...
create table if not exists test_result(
	test_suite	varchar(50),
	test_name 	varchar(50),
	passed 		boolean,
	primary key (test_suite, test_name)
);

create table if not exists test_error(
	test_suite 	varchar(50),
	test_name	varchar(50),
	error_message	varchar(250),
	primary key (test_suite, test_name, error_message),
	FOREIGN KEY (test_suite, test_name) REFERENCES test_result(test_suite, test_name)
);

truncate test_result cascade;
truncate test_error cascade;
...
select * from test_error;
select * from test_result;
```

Im Backend brauchen wir dann nur den Input des Frontends bereinigen und an die Stored Procedures weitergeben. Beispiel aus server.js:
```
pool.query("CALL create_konto($1, $2);", [body, null], (err, pgRes) => {
            if (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end();
            } else {
                console.log('Konto erfolgreich erstellt!');
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, data: pgRes.rows[0] }));
            }
            release();
        });
```
### Ergebnisse
In diesem einfachen Projekt habe ich eine Methodik, die Anwendungslogik vom Backend in die Datenbank zu verlagern, verprobt. Dabei konnte ich die Haupt-Use-Cases und einige Unit-Tests erfolgreich umsetzen und somit die Umsetzbarkeit der Methodik bestätigen. Hier sind einige interessante Punkte, die ich währenddessen beobachtet habe:
- **Debugging:** Beim Debugging der Anwendungslogik (SQL) mithilfe eines Datenbankclients (dbeaver) konnte ich regelmäßig (Sub-)Queries unkompliziert absetzen, um sie inkrementell weiter auszubauen oder zu überprüfen.
- **Netzwerk:** Jedes Mal, wenn das Backend eine Abfrage an die Datenbank schickt, müssen Daten über eine Socket hin und zurück transferiert werden. Auch wenn die Datenmenge gering ist, fällt jedes Mal der Kommunikations-Overhead der Socket an. Liegt die Anwendungslogik im Backend, könnten mehrere Abfragen notwendig sein. Bei dieser Methodik brauchte aber jeweils nur eine Abfrage abgesetzt werden: den Procedure Call.
- **Unit-Tests:** Unit-Tests auf der Datenbank können Vorbereitung, Ausführung und Nachbereitung einfach miteinander verbinden.


## Ausblick
Bisher habe ich den Umgang mit Stored Procedures und fortgeschrittenen SQL Queries gelernt. Als nächstes möchte mein Grundlagenwissen in zwei weiteren Bereichen vertiefen:
- Concurrency Control: welche Anomalien können beim Default Isolation Level bei unserem Anwendungsfall auftreten? Wie können wir die Anomalien in der Datenbank verhindern?
- Performance: ich würde gerne ein fachlich sinnvolles Mengengerüst aufstellen, passende Testdaten generieren und damit Lasttests durchführen. Ist die Latenz beim Durchführen einer Buchung spürbar (>30ms)? Wenn ja, wie können wir die Performance optimieren ohne die Latenz anderer Anwendungsfälle über 30ms zu heben?

Andere Aspekte, in denen ich gerne Unterstützung annehme:
- Im Frontend ist zur eine weitere Funktionalität angedeutet: zur Analyse soll der zeitliche Verlauf des Saldos des gewählten Kontos in einem Diagramm dargestellt werden.
- Die Sicherheit und Robustheit der Anwendung muss noch gewährleistet werden, bevor sie produktiv genutzt werden kann.
- Das Frontend könnte etwas Liebe vertragen (angefangen bei einem CSS-File)

Weitere Visionen für die Zukunft:
- Anbindung von Banken-APIs zur automatisierten Abfrage von neuen Umsätzen, die als offene Buchungen vorbereitet werden.
- Daueraufträge
