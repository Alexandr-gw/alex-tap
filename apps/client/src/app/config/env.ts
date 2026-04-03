function required(name: string, value: string | undefined) {
    if (!value) throw new Error(`Missing required env var: ${name}`)
    return value
}

export const env = {
    apiBaseUrl: required("VITE_API_BASE_URL", import.meta.env.VITE_API_BASE_URL),
    keycloakUrl: required("VITE_KEYCLOAK_URL", import.meta.env.VITE_KEYCLOAK_URL),
    keycloakRealm: required("VITE_KEYCLOAK_REALM", import.meta.env.VITE_KEYCLOAK_REALM),
    keycloakClientId: required("VITE_KEYCLOAK_CLIENT_ID", import.meta.env.VITE_KEYCLOAK_CLIENT_ID),
    googleMapsKey: required("VITE_GOOGLE_MAPS_API_KEY", import.meta.env.VITE_GOOGLE_MAPS_API_KEY),
}
