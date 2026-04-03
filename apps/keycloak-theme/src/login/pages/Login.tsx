import { createElement, useState, type ReactNode } from "react";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import { useIsPasswordRevealed } from "keycloakify/tools/useIsPasswordRevealed";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Brand } from "./shared";
import "./login.css";

export default function Login(props: PageProps<Extract<KcContext, { pageId: "login.ftl" }>, I18n>) {
    const { kcContext, i18n, Template, doUseDefaultCss, classes } = props;

    const { realm, url, usernameHidden, login, auth, messagesPerField, enableWebAuthnConditionalUI, social } = kcContext;
    const { msg, msgStr } = i18n;

    const [isLoginButtonDisabled, setIsLoginButtonDisabled] = useState(false);

    const brandName = (realm.displayName ?? realm.name).toUpperCase();
    const usernameLabel = !realm.loginWithEmailAllowed
        ? msgStr("username")
        : !realm.registrationEmailAsUsername
          ? msgStr("usernameOrEmail")
          : msgStr("email");

    const hasFieldError = messagesPerField.existsError("username", "password");
    const socialProviders = social?.providers ?? [];
    const displaySocialProviders =
        socialProviders.length > 0
            ? socialProviders.map(provider => ({
                  ...provider,
                  isConfigured: true
              }))
            : [
                  {
                      alias: "google",
                      providerId: "google",
                      displayName: "Google",
                      loginUrl: undefined,
                      isConfigured: false
                  },
                  {
                      alias: "github",
                      providerId: "github",
                      displayName: "GitHub",
                      loginUrl: undefined,
                      isConfigured: false
                  }
              ];

    return createElement(
        Template as never,
        {
            kcContext,
            i18n,
            doUseDefaultCss,
            classes,
            headerNode: null,
            displayMessage: !hasFieldError,
            displayInfo: false,
            socialProvidersNode: null,
            bodyClassName: "alex-tap-login-body"
        },
        <>
            <div className="alex-tap-login-shell">
                <Brand name={brandName} />
                <div className="alex-tap-login-form-wrap">
                    {auth !== undefined && auth.showUsername && !auth.showResetCredentials ? (
                        <div className="alex-tap-login-user-chip">
                            <span className="alex-tap-login-user-chip-label">{auth.attemptedUsername}</span>
                            <a href={url.loginRestartFlowUrl} className="alex-tap-login-restart-link">
                                {msg("restartLoginTooltip")}
                            </a>
                        </div>
                    ) : null}

                    {realm.password && (
                        <form
                            id="kc-form-login"
                            className="alex-tap-login-form"
                            onSubmit={() => {
                                setIsLoginButtonDisabled(true);
                                return true;
                            }}
                            action={url.loginAction}
                            method="post"
                        >
                            {!usernameHidden && (
                                <div className="alex-tap-form-group">
                                    <label className="alex-tap-sr-only" htmlFor="username">
                                        {usernameLabel}
                                    </label>
                                    <input
                                        tabIndex={2}
                                        id="username"
                                        className="alex-tap-input"
                                        name="username"
                                        defaultValue={login.username ?? ""}
                                        type="text"
                                        autoFocus
                                        autoComplete={enableWebAuthnConditionalUI ? "username webauthn" : "username"}
                                        aria-invalid={hasFieldError}
                                        placeholder={`${usernameLabel}*`}
                                    />
                                    {hasFieldError && (
                                        <span
                                            id="input-error"
                                            className="alex-tap-input-error"
                                            aria-live="polite"
                                            dangerouslySetInnerHTML={{
                                                __html: kcSanitize(messagesPerField.getFirstError("username", "password"))
                                            }}
                                        />
                                    )}
                                </div>
                            )}

                            <div className="alex-tap-form-group">
                                <label className="alex-tap-sr-only" htmlFor="password">
                                    {msgStr("password")}
                                </label>
                                <PasswordField passwordInputId="password" label={msgStr("password")} i18n={i18n}>
                                    <input
                                        tabIndex={3}
                                        id="password"
                                        className="alex-tap-input alex-tap-input-password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        aria-invalid={hasFieldError}
                                        placeholder={`${msgStr("password")}*`}
                                    />
                                </PasswordField>
                                {usernameHidden && hasFieldError && (
                                    <span
                                        id="input-error"
                                        className="alex-tap-input-error"
                                        aria-live="polite"
                                        dangerouslySetInnerHTML={{
                                            __html: kcSanitize(messagesPerField.getFirstError("username", "password"))
                                        }}
                                    />
                                )}
                            </div>

                            {realm.resetPasswordAllowed && (
                                <div className="alex-tap-login-actions">
                                    <a tabIndex={6} href={url.loginResetCredentialsUrl} className="alex-tap-forgot-link">
                                        {msg("doForgotPassword")}
                                    </a>
                                </div>
                            )}

                            <div className="alex-tap-button-wrap">
                                <input type="hidden" id="id-hidden-input" name="credentialId" value={auth?.selectedCredential ?? ""} />
                                <input
                                    tabIndex={7}
                                    disabled={isLoginButtonDisabled}
                                    className="alex-tap-login-button"
                                    name="login"
                                    id="kc-login"
                                    type="submit"
                                    value={msgStr("doLogIn")}
                                />
                            </div>
                        </form>
                    )}

                    <div className="alex-tap-social-section">
                        <div className="alex-tap-social-divider" aria-hidden="true">
                            <span>OR</span>
                        </div>

                        <div className="alex-tap-social-list">
                            {displaySocialProviders.map(provider => (
                                <a
                                    key={provider.alias}
                                    href={provider.loginUrl ?? "#"}
                                    className="alex-tap-social-button"
                                    data-provider={provider.providerId ?? provider.alias}
                                    data-configured={provider.isConfigured ? "true" : "false"}
                                    aria-disabled={!provider.isConfigured}
                                    onClick={event => {
                                        if (!provider.isConfigured) {
                                            event.preventDefault();
                                        }
                                    }}
                                >
                                    <span className="alex-tap-social-icon" aria-hidden="true">
                                        {getProviderIcon(provider.providerId ?? provider.alias)}
                                    </span>
                                    <span className="alex-tap-social-label">
                                        Continue with {provider.displayName}
                                    </span>
                                </a>
                            ))}
                        </div>

                        {socialProviders.length === 0 && (
                            <p className="alex-tap-social-hint">
                                Add the Google and GitHub OAuth credentials to enable these buttons.
                            </p>
                        )}

                        <div className="alex-tap-demo-notice">
                            <p className="alex-tap-demo-notice-title">Public demo access</p>
                            <p className="alex-tap-demo-notice-copy">
                                For testing, you can sign in with Google or GitHub and get temporary manager access to
                                demo data.
                            </p>
                            <p className="alex-tap-demo-notice-copy">
                                You can revoke this app later from your Google or GitHub connected apps settings.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function getProviderIcon(providerId: string) {
    switch (providerId.toLowerCase()) {
        case "google":
            return (
                <svg viewBox="0 0 24 24" className="alex-tap-social-icon-svg" role="presentation">
                    <path
                        d="M21.8 12.23c0-.76-.07-1.5-.2-2.2H12v4.17h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.05-4.4 3.05-7.61Z"
                        fill="#4285F4"
                    />
                    <path
                        d="M12 22c2.75 0 5.05-.91 6.73-2.47l-3.3-2.56c-.91.61-2.08.97-3.43.97-2.64 0-4.88-1.78-5.68-4.17H2.9v2.64A9.99 9.99 0 0 0 12 22Z"
                        fill="#34A853"
                    />
                    <path
                        d="M6.32 13.77A5.99 5.99 0 0 1 6 12c0-.61.11-1.2.32-1.77V7.59H2.9A10 10 0 0 0 2 12c0 1.61.38 3.13 1.05 4.41l3.27-2.64Z"
                        fill="#FBBC04"
                    />
                    <path
                        d="M12 6.06c1.49 0 2.84.51 3.9 1.51l2.92-2.92C17.04 2.99 14.74 2 12 2a9.99 9.99 0 0 0-9.1 5.59l3.42 2.64c.8-2.39 3.04-4.17 5.68-4.17Z"
                        fill="#EA4335"
                    />
                </svg>
            );
        case "github":
            return (
                <svg viewBox="0 0 24 24" className="alex-tap-social-icon-svg" role="presentation">
                    <path
                        fill="currentColor"
                        d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.42-4.04-1.42-.55-1.37-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.08 1.84 2.82 1.31 3.51 1 .1-.77.42-1.31.76-1.61-2.67-.3-5.48-1.34-5.48-5.95 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.53.12-3.19 0 0 1.01-.32 3.3 1.23a11.52 11.52 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.65 1.66.24 2.89.12 3.19.77.84 1.23 1.91 1.23 3.22 0 4.62-2.82 5.64-5.5 5.94.43.37.82 1.1.82 2.21v3.27c0 .32.21.7.83.58A12 12 0 0 0 12 .5Z"
                    />
                </svg>
            );
        default:
            return providerId.slice(0, 2).toUpperCase();
    }
}

function PasswordField(props: { passwordInputId: string; label: string; i18n: I18n; children: ReactNode }) {
    const { passwordInputId, label, i18n, children } = props;
    const { msgStr } = i18n;
    const { isPasswordRevealed, toggleIsPasswordRevealed } = useIsPasswordRevealed({ passwordInputId });

    return (
        <div className="alex-tap-password-field">
            {children}
            <button
                type="button"
                className="alex-tap-password-toggle"
                aria-label={msgStr(isPasswordRevealed ? "hidePassword" : "showPassword")}
                aria-controls={passwordInputId}
                onClick={toggleIsPasswordRevealed}
                title={label}
            >
                <span
                    className={`alex-tap-eye ${isPasswordRevealed ? "alex-tap-eye-open" : "alex-tap-eye-closed"}`}
                    aria-hidden="true"
                />
            </button>
        </div>
    );
}
