import { createElement, useState } from "react";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Brand } from "./shared";
import "./login.css";

export default function ResetPassword(
    props: PageProps<Extract<KcContext, { pageId: "login-reset-password.ftl" }>, I18n>
) {
    const { kcContext, i18n, Template, doUseDefaultCss, classes } = props;
    const { realm, url, auth, messagesPerField } = kcContext;
    const { msg, msgStr } = i18n;

    const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
    const brandName = (realm.displayName ?? realm.name).toUpperCase();
    const usernameLabel = realm.loginWithEmailAllowed ? msgStr("usernameOrEmail") : msgStr("username");
    const hasFieldError = messagesPerField.existsError("username");

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
        <div className="alex-tap-login-shell">
            <Brand name={brandName} />
            <div className="alex-tap-login-form-wrap">
                <div className="alex-tap-auth-panel">
                    <h2 className="alex-tap-panel-title">{msg("emailForgotTitle")}</h2>
                    <p className="alex-tap-panel-copy">
                        {msg(realm.loginWithEmailAllowed ? "emailInstruction" : "emailInstructionUsername")}
                    </p>

                    <form
                        id="kc-reset-password-form"
                        className="alex-tap-login-form"
                        action={url.loginAction}
                        method="post"
                        onSubmit={() => {
                            setIsSubmitDisabled(true);
                            return true;
                        }}
                    >
                        <div className="alex-tap-form-group">
                            <label className="alex-tap-sr-only" htmlFor="username">
                                {usernameLabel}
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoFocus
                                autoComplete="username"
                                defaultValue={auth?.attemptedUsername ?? ""}
                                className="alex-tap-input"
                                aria-invalid={hasFieldError}
                                placeholder={`${usernameLabel}*`}
                            />
                            {hasFieldError && (
                                <span
                                    className="alex-tap-input-error"
                                    aria-live="polite"
                                    dangerouslySetInnerHTML={{
                                        __html: kcSanitize(messagesPerField.getFirstError("username"))
                                    }}
                                />
                            )}
                        </div>

                        <div className="alex-tap-button-wrap">
                            <input
                                className="alex-tap-login-button"
                                type="submit"
                                value={msgStr("doSubmit")}
                                disabled={isSubmitDisabled}
                            />
                        </div>
                    </form>

                    <div className="alex-tap-secondary-actions">
                        <a href={url.loginUrl} className="alex-tap-secondary-link">
                            {msg("backToLogin")}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
