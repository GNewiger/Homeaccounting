call create_konto('sparkonto');
call buchen(1::smallint, false, current_timestamp::timestamp, 'test buchung'::varchar(100), 
	row(2, 2000, '2€ von Sparkonto')::target_konto_split,
	row(3, 3000, '3€ von Gehalt')::target_konto_split);
select * from saldo;

call unit_test();
select * from saldo;
select * from buchung;
select * from konto;

call create_konto('Gehalt'::varchar, statement_timestamp()::timestamp);
call create_konto('Bafoeg'::varchar, statement_timestamp()::timestamp);
call create_konto('Sparen'::varchar, statement_timestamp()::timestamp);

truncate buchung cascade;
truncate buchung_target cascade;

call buchen(1::smallint, false, statement_timestamp()::timestamp, 'Guilians Gehalt'::varchar,
	row(2, to_number('2000,00', '9999G99'), 'für vorzeitige Rückzahlung')::target_konto_split,
	row(3, to_number('1000,00', '9999G99'), '')::target_konto_split);
