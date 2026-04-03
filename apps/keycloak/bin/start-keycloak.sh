#!/bin/sh
set -eu

IMPORT_ENV="${KEYCLOAK_IMPORT_ENV:-${APP_ENV:-production}}"
IMPORT_ROOT="/opt/keycloak/realm-imports"
IMPORT_DIR="/opt/keycloak/data/import"

if [ -n "${PORT:-}" ] && [ -z "${KC_HTTP_PORT:-}" ]; then
    export KC_HTTP_PORT="$PORT"
fi

case "$IMPORT_ENV" in
    local)
        SOURCE_FILE="$IMPORT_ROOT/local/alex-tap-local-realm.json"
        ;;
    staging)
        SOURCE_FILE="$IMPORT_ROOT/staging/alex-tap-staging-realm.json"
        ;;
    production|prod)
        SOURCE_FILE="$IMPORT_ROOT/prod/alex-tap-realm.json"
        ;;
    *)
        echo "Unsupported KEYCLOAK_IMPORT_ENV/APP_ENV value: $IMPORT_ENV" >&2
        exit 1
        ;;
esac

if [ ! -f "$SOURCE_FILE" ]; then
    echo "Realm import file not found: $SOURCE_FILE" >&2
    exit 1
fi

mkdir -p "$IMPORT_DIR"
cp "$SOURCE_FILE" "$IMPORT_DIR/alex-tap-realm.json"

echo "Using Keycloak realm import: $SOURCE_FILE"

if [ "$#" -eq 0 ]; then
    set -- start --optimized --import-realm
fi

exec /opt/keycloak/bin/kc.sh "$@"
