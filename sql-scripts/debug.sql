call create_konto('sparkonto');
call buchen(1::smallint, false, current_timestamp::timestamp, 'test buchung'::varchar(100), 
	row(2, 2000, '2€ von Sparkonto')::target_konto_split,
	row(3, 3000, '3€ von Gehalt')::target_konto_split);
select * from saldo;
