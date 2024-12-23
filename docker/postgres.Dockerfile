FROM postgres:17-alpine
ADD sql-scripts/init/1_init.sql /docker-entrypoint-initdb.d
RUN chmod a+r /docker-entrypoint-initdb.d/*
EXPOSE 5432
