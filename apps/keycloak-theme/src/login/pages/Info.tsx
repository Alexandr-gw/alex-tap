import { createElement } from "react";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Brand } from "./shared";
import "./login.css";

export default function Info(props: PageProps<Extract<KcContext, { pageId: "info.ftl" }>, I18n>) {
    const { kcContext, i18n, Template, doUseDefaultCss, classes } = props;
    const { realm, pageRedirectUri, actionUri, skipLink, message, messageHeader, url } = kcContext;
    const { msgStr } = i18n;

    const brandName = (realm.displayName ?? realm.name).toUpperCase();

    return createElement(
        Template as never,
        {
            kcContext,
            i18n,
            doUseDefaultCss,
            classes,
            headerNode: null,
            displayMessage: false,
            displayInfo: false,
            socialProvidersNode: null,
            bodyClassName: "alex-tap-login-body"
        },
        <div className="alex-tap-login-shell">
            <Brand name={brandName} />
            <div className="alex-tap-login-form-wrap">
                <div className="alex-tap-auth-panel">
                    <h2
                        className="alex-tap-panel-title"
                        dangerouslySetInnerHTML={{
                            __html: kcSanitize(messageHeader ?? "Check your email")
                        }}
                    />

                    {message?.summary && (
                        <p
                            className="alex-tap-panel-copy"
                            dangerouslySetInnerHTML={{
                                __html: kcSanitize(message.summary)
                            }}
                        />
                    )}

                    <div className="alex-tap-secondary-actions alex-tap-secondary-actions-stack">
                        {(pageRedirectUri ?? actionUri) && (
                            <a href={pageRedirectUri ?? actionUri ?? "#"} className="alex-tap-login-button alex-tap-button-link">
                                {msgStr(skipLink ? "doClickHere" : "doContinue")}
                            </a>
                        )}

                        <a href={url.loginUrl} className="alex-tap-secondary-link">
                            {msgStr("backToLogin")}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
