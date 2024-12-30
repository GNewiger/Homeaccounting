FROM postgres:17
RUN localedef -i de_DE -c -f UTF-8 -A /usr/share/locale/locale.alias de_DE.UTF-8
ENV LC_MONETARY=de_DE.utf8
ENV LC_TIME=de_DE.utf8
ADD sql-scripts/init/1_init.sql /docker-entrypoint-initdb.d
RUN chmod a+r /docker-entrypoint-initdb.d/*
EXPOSE 5432
