ARG KEYCLOAK_VERSION=26.3.2
ARG KEYCLOAK_THEME_JAR=keycloak-theme-for-kc-all-other-versions.jar

FROM node:22-bookworm-slim AS assets-builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends openjdk-17-jre-headless maven \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/client/package.json ./apps/client/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY apps/keycloak-theme/package.json ./apps/keycloak-theme/package.json

RUN npm ci

COPY apps/server ./apps/server
COPY apps/keycloak-theme ./apps/keycloak-theme

RUN npm -w apps/server run keycloak:generate-realms \
    && npm -w apps/keycloak-theme run build-keycloak-theme

FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION} AS keycloak-builder

ARG KEYCLOAK_THEME_JAR

COPY --from=assets-builder /workspace/apps/keycloak-theme/dist_keycloak/${KEYCLOAK_THEME_JAR} /opt/keycloak/providers/alex-tap-keycloak-theme.jar

RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION}

COPY --from=keycloak-builder /opt/keycloak/ /opt/keycloak/
COPY --from=assets-builder /workspace/apps/server/keycloak/generated /opt/keycloak/realm-imports
COPY apps/keycloak/bin/start-keycloak.sh /opt/keycloak/bin/alex-tap-keycloak-start.sh

USER root
RUN chmod 0755 /opt/keycloak/bin/alex-tap-keycloak-start.sh \
    && mkdir -p /opt/keycloak/data/import \
    && chown -R keycloak:keycloak /opt/keycloak/realm-imports /opt/keycloak/data/import /opt/keycloak/bin/alex-tap-keycloak-start.sh
USER keycloak

ENV KC_HEALTH_ENABLED=true \
    KC_METRICS_ENABLED=true \
    KC_PROXY_HEADERS=xforwarded \
    KC_HTTP_ENABLED=true

EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/bin/alex-tap-keycloak-start.sh"]
