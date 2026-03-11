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
    const updatedAt = draft.updatedAt;
    if (!updatedAt) return true;
    return Date.now() - updatedAt < DRAFT_TTL_MS;
}

export function useBookingWizard(companySlug: string) {
    const key = useMemo(() => bookingDraftKey(companySlug), [companySlug]);

    const savedDraft = useMemo(() => loadBookingDraft(key), [key]);
    const savedDraftIsFresh = Boolean(savedDraft) && isDraftFresh(savedDraft as BookingDraft);
    const savedDraftIsCompleted = savedDraft?.status === "completed";
    const savedDraftCanResume = Boolean(savedDraft) && savedDraftIsFresh && !savedDraftIsCompleted;

    const [resumeChoiceRequired, setResumeChoiceRequired] = useState(savedDraftCanResume);
    const [draft, dispatch] = useReducer(bookingReducer, bookingInitialDraft);

    useEffect(() => {
        if (savedDraft && (!savedDraftIsFresh || savedDraftIsCompleted)) {
            clearBookingDraft(key);
        }
    }, [key, savedDraft, savedDraftIsFresh, savedDraftIsCompleted]);

    useEffect(() => {
        if (resumeChoiceRequired) return;

        const toSave: BookingDraft = {
            ...draft,
            status: draft.status ?? "active",
            updatedAt: Date.now(),
        };

        saveBookingDraft(key, toSave);
    }, [key, draft, resumeChoiceRequired]);

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
        setResumeChoiceRequired(false);
        dispatch({ type: "RESET" });
    }

    function continueSavedDraft() {
        if (!savedDraftCanResume || !savedDraft) {
            setResumeChoiceRequired(false);
            return;
        }

        dispatch({
            type: "RESET",
            draft: {
                ...savedDraft,
                status: "active",
                completedAt: null,
            },
        });
        setResumeChoiceRequired(false);
    }

    function startFresh() {
        clearBookingDraft(key);
        dispatch({ type: "RESET" });
        setResumeChoiceRequired(false);
    }

    function markCompleted() {
        dispatch({ type: "MARK_COMPLETED" });
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
        markCompleted,
        savedDraft: savedDraftCanResume ? savedDraft : null,
        resumeChoiceRequired,
        continueSavedDraft,
        startFresh,
    };
}
