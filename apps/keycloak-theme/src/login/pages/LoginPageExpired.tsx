import { createElement } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Brand } from "./shared";
import "./login.css";

export default function LoginPageExpired(
    props: PageProps<Extract<KcContext, { pageId: "login-page-expired.ftl" }>, I18n>
) {
    const { kcContext, i18n, Template, doUseDefaultCss, classes } = props;
    const { realm, url } = kcContext;
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
                    <h2 className="alex-tap-panel-title">{msgStr("pageExpiredTitle")}</h2>
                    <p className="alex-tap-panel-copy">
                        {msgStr("pageExpiredMsg1")}
                    </p>
                    <p className="alex-tap-panel-copy">
                        {msgStr("pageExpiredMsg2")}
                    </p>

                    <div className="alex-tap-secondary-actions alex-tap-secondary-actions-stack">
                        <a href={url.loginRestartFlowUrl} className="alex-tap-login-button alex-tap-button-link">
                            {msgStr("doClickHere")}
                        </a>

                        <a href={url.loginAction ?? url.loginUrl} className="alex-tap-secondary-link">
                            {msgStr("backToLogin")}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
