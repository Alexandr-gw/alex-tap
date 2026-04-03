import { createElement, useMemo, useState } from "react";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
import type { UserProfileFormFieldsProps } from "keycloakify/login/UserProfileFormFieldsProps";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { LazyOrNot } from "keycloakify/tools/LazyOrNot";
import type { JSX } from "keycloakify/tools/JSX";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Brand } from "./shared";
import "./login.css";

type SupportedProfilePage = Extract<
    KcContext,
    { pageId: "idp-review-user-profile.ftl" | "login-update-profile.ftl" }
>;

type ProfileFormProps = PageProps<SupportedProfilePage, I18n> & {
    UserProfileFormFields: LazyOrNot<(props: UserProfileFormFieldsProps) => JSX.Element>;
    doMakeUserConfirmPassword: boolean;
};

export default function ProfileForm(props: ProfileFormProps) {
    const { kcContext, i18n, Template, doUseDefaultCss, classes, UserProfileFormFields, doMakeUserConfirmPassword } = props;
    const { realm, url, message, messagesPerField, isAppInitiatedAction } = kcContext;
    const { msg, msgStr } = i18n;

    const [isFormSubmittable, setIsFormSubmittable] = useState(false);
    const brandName = (realm.displayName ?? realm.name).toUpperCase();

    const profileClasses = useMemo(
        () => ({
            ...classes,
            kcFormClass: "alex-tap-login-form",
            kcFormGroupClass: "alex-tap-form-group",
            kcLabelWrapperClass: "alex-tap-profile-label-wrap",
            kcLabelClass: "alex-tap-profile-label",
            kcInputWrapperClass: "alex-tap-profile-input-wrap",
            kcInputClass: "alex-tap-input",
            kcInputGroup: "alex-tap-password-field",
            kcFormPasswordVisibilityButtonClass: "alex-tap-password-toggle",
            kcFormPasswordVisibilityIconShow: "alex-tap-eye",
            kcFormPasswordVisibilityIconHide: "alex-tap-eye alex-tap-eye-closed",
            kcInputErrorMessageClass: "alex-tap-input-error",
            kcInputHelperTextBeforeClass: "alex-tap-profile-helper",
            kcInputHelperTextAfterClass: "alex-tap-profile-helper",
            kcContentWrapperClass: "alex-tap-profile-group-wrap",
            kcFormGroupHeader: "alex-tap-profile-group-title"
        }),
        [classes]
    );

    const { kcClsx } = getKcClsx({
        doUseDefaultCss,
        classes: profileClasses
    });

    const title =
        kcContext.pageId === "idp-review-user-profile.ftl" ? msg("loginIdpReviewProfileTitle") : msg("loginProfileTitle");

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
                    <h2 className="alex-tap-panel-title">{title}</h2>

                    {message !== undefined && (
                        <div className={`alex-tap-inline-alert alex-tap-inline-alert-${message.type}`}>
                            <span
                                dangerouslySetInnerHTML={{
                                    __html: kcSanitize(message.summary)
                                }}
                            />
                        </div>
                    )}

                    <form id="kc-update-profile-form" className="alex-tap-login-form" action={url.loginAction} method="post">
                        {createElement(UserProfileFormFields as never, {
                            kcContext,
                            i18n,
                            kcClsx,
                            onIsFormSubmittableValueChange: setIsFormSubmittable,
                            doMakeUserConfirmPassword
                        })}

                        {messagesPerField.exists("global") && (
                            <span className="alex-tap-input-error" aria-live="polite">
                                {messagesPerField.get("global")}
                            </span>
                        )}

                        <div className="alex-tap-button-wrap alex-tap-profile-buttons">
                            <input
                                className="alex-tap-login-button"
                                type="submit"
                                value={msgStr("doSubmit")}
                                disabled={!isFormSubmittable}
                            />

                            {isAppInitiatedAction && (
                                <button
                                    className="alex-tap-profile-secondary-button"
                                    type="submit"
                                    name="cancel-aia"
                                    value="true"
                                    formNoValidate
                                >
                                    {msg("doCancel")}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
