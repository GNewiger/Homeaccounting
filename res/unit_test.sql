create or replace procedure test_buchen_source_haben()
language plpgsql
as $$
begin
    truncate buchung cascade;
    truncate buchung_target cascade;

    call buchen(1::smallint, true, clock_timestamp()::timestamp, 'Guilians Gehalt'::varchar,
	row(2, to_number('2000,00', '9999G99'), 'für vorzeitige Rückzahlung')::target_konto_split,
	row(3, to_number('1000,00', '9999G99'), '')::target_konto_split);
    
    with only_one_buchung as (
        select 'only_one_buchung' as name, count(*) != 1 as is_error, 'Expected count of buchung to be 1, actual: ' || count(*) as error_message from buchung
    ),
    source_has_right_amount as (
        select 'source_has_right_amount' as name, amount_in_cents != to_number('3000,00', '9999G99') as is_error, 'Expected amount to be 3000,00€, actual: ' || to_char(amount_in_cents, 'FM99999999G99L') as error_message from buchung
    ),
    source_is_haben as (
        select 'source_is_haben' as name, not source_konto_is_on_haben_side as is_error, 'Expected source buchung to be haben, actual: soll' as error_message from buchung
    ),
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
    truncate buchung cascade;
    truncate buchung_target cascade;

    call buchen(1::smallint, false, clock_timestamp()::timestamp, 'Guilians Gehalt'::varchar,
	row(2, to_number('2000,00', '9999G99'), 'für vorzeitige Rückzahlung')::target_konto_split);
    
    with target_has_right_amount as (
        select 'target_has_right_amount' as name, amount_in_cents != to_number('2000,00', '9999G99') as is_error, 'Expected amount to be 2000,00€, actual: ' || to_char(amount_in_cents, 'FM99999999G99L') as error_message from buchung
    ),
    source_is_soll as (
        select 'source_is_soll' as name, source_konto_is_on_haben_side as is_error, 'Expected source buchung to be soll, actual: haben' as error_message from buchung
    ),
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

-- general setup
truncate konto restart identity cascade;

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

call create_konto('Gehalt'::varchar, null, clock_timestamp()::timestamp);
call create_konto('Bafoeg'::varchar, null, clock_timestamp()::timestamp);
call create_konto('Sparen'::varchar, null, clock_timestamp()::timestamp);

call test_buchen_source_haben();
call test_buchen_source_soll();

select * from test_error;
select * from test_result;
