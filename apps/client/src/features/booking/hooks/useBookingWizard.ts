import { useEffect, useMemo, useReducer, useState } from "react";
import {
    bookingDraftKey,
    loadBookingDraft,
    saveBookingDraft,
    clearBookingDraft,
} from "../draft.utils";
import { bookingInitialDraft, bookingReducer } from "../booking.store";
import { WIZARD_STEPS } from "../booking.types";
import type { BookingDraft, WizardStepId } from "../booking.types";

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function isDraftFresh(draft: BookingDraft) {
    if (!("updatedAt" in draft)) return true;
    const updatedAt = (draft as any).updatedAt as number | undefined;
    if (!updatedAt) return true;
    return Date.now() - updatedAt < DRAFT_TTL_MS;
}

export function useBookingWizard(companySlug: string) {
    const key = useMemo(() => bookingDraftKey(companySlug), [companySlug]);

    const saved = useMemo(() => loadBookingDraft(key), [key]);
    const savedIsUsable = Boolean(saved) && isDraftFresh(saved as BookingDraft);

    const [hadSavedDraft] = useState(() => savedIsUsable);

    const [draft, dispatch] = useReducer(
        bookingReducer,
        bookingInitialDraft,
        (initial): BookingDraft => {
            if (saved && savedIsUsable) return saved as BookingDraft;
            return initial;
        }
    );

    useEffect(() => {
        const toSave =
            "updatedAt" in draft
                ? ({ ...draft, updatedAt: Date.now() } as BookingDraft)
                : draft;

        saveBookingDraft(key, toSave);
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
        hadSavedDraft,
    };
}