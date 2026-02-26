import { useEffect, useMemo, useReducer } from "react";
import { bookingDraftKey, loadBookingDraft, saveBookingDraft, clearBookingDraft } from "../draft.utils";
import { bookingInitialDraft, bookingReducer } from "../booking.store";
import { WIZARD_STEPS } from "../booking.types";
import type { BookingDraft, WizardStepId } from "../booking.types";

export function useBookingWizard(companySlug: string) {
    const key = useMemo(() => bookingDraftKey(companySlug), [companySlug]);

    const [draft, dispatch] = useReducer(
        bookingReducer,
        bookingInitialDraft,
        (initial): BookingDraft => {
            const saved = loadBookingDraft(key);
            return saved ?? initial;
        }
    );

    useEffect(() => {
        saveBookingDraft(key, draft);
    }, [key, draft]);

    const stepId: WizardStepId =
        WIZARD_STEPS[Math.min(draft.stepIndex, WIZARD_STEPS.length - 1)];

    function setStep(stepIndex: number) {
        dispatch({ type: "SET_STEP", stepIndex });
    }

    function next() {
        setStep(Math.min(draft.stepIndex + 1, WIZARD_STEPS.length - 1));
    }

    function back() {
        setStep(Math.max(draft.stepIndex - 1, 0));
    }

    function reset() {
        clearBookingDraft(key);
        dispatch({ type: "RESET" });
    }

    return {
        key,
        draft,
        stepId,
        steps: WIZARD_STEPS,
        dispatch,
        next,
        back,
        reset,
        setStep,
    };
}