FROM postgres:17-alpine
ENV LC_ALL de_DE.utf-8
ADD sql-scripts/init/1_init.sql /docker-entrypoint-initdb.d
ADD sql-scripts/test/buchen_test.sql /docker-entrypoint-initdb.d
RUN chmod a+r /docker-entrypoint-initdb.d/*
EXPOSE 5432
