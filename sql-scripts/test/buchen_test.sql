create or replace procedure run_unit_tests()
language plpgsql
as $$
DECLARE
    bafoeg_id konto.id%TYPE;
    versicherung_id konto.id%TYPE;
    gehalt_id konto.id%TYPE;
begin
    -- general setup
    truncate test_result cascade;
    truncate test_error cascade;
    truncate konto restart identity cascade;

    call create_konto('bafoeg', bafoeg_id);
    call create_konto('versicherung', versicherung_id);
    call create_konto('gehalt', gehalt_id);

    -- test execution
    call test_buchen_source_haben(bafoeg_id, versicherung_id, gehalt_id);
    --call test_buchen_source_soll();

    -- cleanup
    --truncate konto cascade;
end$$;

create or replace procedure test_buchen_source_haben(bafoeg_id smallint, versicherung_id smallint, gehalt_id smallint)
language plpgsql
as $$
DECLARE
    name varchar(50);
begin
    name := 'Split onto several soll-konten';
    truncate buchung cascade;
    truncate buchung_target cascade;
    call buchen(gehalt_id, true, '2024-06-25 21:25:51.627 +0200', 'source desc', row(bafoeg_id, 100, 'target desc')::target_konto_split, row(versicherung_id, 50, 'target desc')::target_konto_split);
    
    with only_one_buchung as (
        select count(*) != 1 as is_error, 'Expected count of buchung to be 1, actual: ' || count(*) as error_message from buchung
    ),
    source_has_right_amount as (
        select amount != 150 as is_error, 'Expected amount to be 150, actual: ' || amount as error_message from buchung
    ),
    source_is_haben as (
        select not source_konto_is_on_haben_side as is_error, 'Expected source buchung to be haben, actual: soll' as error_message from buchung
    ),
    result as (
        insert into test_result(test_name, passed)
        select name, case
            when exists
            (
                select is_error from only_one_buchung where is_error = true
                union all
                select is_error from source_has_right_amount where is_error = true
                union all
                select is_error from source_is_haben where is_error = true
            )
            then false
            else true
            end
    )
    insert into test_error(test_name, error_message)
        select name, error_message from only_one_buchung where is_error
        union all
        select name, error_message from source_has_right_amount where is_error
        union all
        select name, error_message from source_is_haben where is_error;
end$$;
