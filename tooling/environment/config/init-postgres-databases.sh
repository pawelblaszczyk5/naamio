#!/bin/bash
set -e

# cspell:ignore psql EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  CREATE ROLE naamio_cluster WITH LOGIN PASSWORD 'example_cluster_password_123';
  CREATE DATABASE naamio_cluster OWNER naamio_cluster;

  CREATE ROLE naamio_app WITH LOGIN PASSWORD 'example_app_password_123';
  CREATE DATABASE naamio_app OWNER naamio_app;

  CREATE ROLE naamio_electric WITH SUPERUSER LOGIN PASSWORD 'example_electric_password_123';
EOSQL