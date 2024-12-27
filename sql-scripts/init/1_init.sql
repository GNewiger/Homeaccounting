-- TODO: create app role mit credentials aus Umbegungsvariablen, vergib privileges

-- tables 
create table konto(
	id	smallint primary key generated by default as identity,
	name	varchar(30) not null unique -- why not primary key? because name shall be changable without having to rearrange buchungen
);
create table saldo(
	konto			smallint not null references konto(id),
	point_in_time		timestamp not null default current_timestamp,
	haben_in_cents		integer not null default 0, -- because we only do addition and subtraction, no need to worry about exactness of floating points operations
	soll_in_cents		integer not null default 0, -- because we only do addition and subtraction, no need to worry about exactness of floating points operations
	primary key (konto, point_in_time)
);

create table buchung(
	id								integer primary key generated by default as identity,
	amount_in_cents					integer not null, --because we only do addition and subtraction, no need to worry about exactness of floating points operations
	source_konto					smallint not null references konto(id),
	source_konto_is_on_haben_side	boolean not null default true, -- otherwise it's Soll
	description						varchar(100),
	time_of_transfer				timestamp not null default current_timestamp
);
create index on buchung (time_of_transfer);

-- needs to be extra table for splitting to several targets
create table buchung_target(
	buchung_id		integer not null references buchung(id),
	amount_in_cents	integer not null, -- the part of the overall amount that goes to this target_konto
	target_konto	smallint not null references konto(id),
	description		varchar(100),
	primary key (buchung_id, target_konto) -- splitting: the amount from source can be split to several target kontos
);

create table test_result(
	test_name 	varchar(50) primary key,
	passed 		boolean
);

create table test_error(
	test_name	varchar(50) references test_result(test_name),
	error_message	varchar(250),
	primary key (test_name, error_message)
);

create table test_performance_result(
	test_name		varchar(50) primary key references test_result(test_name),
	time_in_millis		bigint
);

create type target_konto_split AS (
    konto_id smallint,
    amount_in_cents integer,
    description varchar(100)
);

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
    if source_konto_is_on_haben_side then
			insert into saldo(konto, point_in_time, haben_in_cents, soll_in_cents)
			with latest as
			(
				select max(point_in_time) as point_in_time from saldo group by konto having konto = source_konto_id
			)
			select source_konto_id, time_of_transfer, haben_in_cents + total, soll_in_cents
			from saldo join latest using(point_in_time)
			where konto = source_konto_id;
	else
			insert into saldo(konto, point_in_time, haben_in_cents, soll_in_cents)
			with latest as
			(
				select max(point_in_time) as point_in_time from saldo group by konto having konto = source_konto_id
			)			
			select source_konto_id, time_of_transfer, haben_in_cents, soll_in_cents + total
			from saldo join latest using(point_in_time)
			where konto = source_konto_id;
			
	end if;

    foreach split_buchung in array target_konto_split_arr
    loop
        insert into buchung_target(buchung_id, amount_in_cents, target_konto, description)
	    values (buchung_id, split_buchung.amount_in_cents, split_buchung.konto_id, split_buchung.description);

		-- Saldo des Split-Kontos anpassen
		if source_konto_is_on_haben_side then
			insert into saldo(konto, point_in_time, haben_in_cents, soll_in_cents)
			with latest as
			(
				select max(point_in_time) as point_in_time from saldo group by konto having konto = split_buchung.konto_id
			)
			select split_buchung.konto_id, time_of_transfer, haben_in_cents, soll_in_cents + split_buchung.amount_in_cents
			from saldo join latest using(point_in_time)
			where konto = split_buchung.konto_id;
		else
			insert into saldo(konto, point_in_time, haben_in_cents, soll_in_cents)
			with latest as
			(
				select max(point_in_time) as point_in_time from saldo group by konto having konto = split_buchung.konto_id
			)
			select split_buchung.konto_id, time_of_transfer, haben_in_cents + split_buchung.amount_in_cents, soll_in_cents
			from saldo join latest using(point_in_time)
			where konto = split_buchung.konto_id;
		end if;
    end loop;
end;
$$ language plpgsql;

create or replace procedure create_konto(IN "name" varchar(30), out id smallint, in creation_timestamp timestamp default current_timestamp)
language sql
as $$
    with created_konto as (
        insert into konto("name")
        values ("name") returning id
    )
    insert into saldo(konto, point_in_time) -- initializes with default 0 in both soll and haben
    select id, creation_timestamp from created_konto;
    
    -- return result
    select id from konto where "name" = create_konto."name";
$$;
