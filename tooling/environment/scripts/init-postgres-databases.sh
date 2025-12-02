#!/bin/bash
set -e

# cspell:ignore psql EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  CREATE USER naamio_cluster WITH PASSWORD 'example_cluster_password_123';
  CREATE DATABASE naamio_cluster OWNER naamio_cluster;
  GRANT ALL PRIVILEGES ON DATABASE naamio_cluster TO naamio_cluster;

  CREATE USER naamio_app WITH PASSWORD 'example_app_password_123';
  ALTER ROLE naamio_app WITH REPLICATION;
  CREATE DATABASE naamio_app OWNER naamio_app;
  GRANT ALL PRIVILEGES ON DATABASE naamio_app TO naamio_app;
EOSQL