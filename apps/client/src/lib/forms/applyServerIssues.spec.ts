import { describe, expect, it, vi } from "vitest";

import { applyApiErrorToForm, applyServerIssues } from "./applyServerIssues";

describe("applyServerIssues", () => {
  it("falls back to a root server error when no issues are present", () => {
    const setError = vi.fn();

    applyServerIssues(setError, undefined, "Please review the form.");

    expect(setError).toHaveBeenCalledWith("root", {
      type: "server",
      message: "Please review the form.",
    });
  });

  it("maps nested server issue paths into react-hook-form dot paths", () => {
    const setError = vi.fn();

    applyServerIssues(
      setError,
      [
        { path: ["client", "email"], message: "Email is required." },
        { path: ["lineItems", 0, "name"], message: "Name is required." },
      ],
      "Please review the form.",
    );

    expect(setError).toHaveBeenNthCalledWith(1, "client.email", {
      type: "server",
      message: "Email is required.",
    });
    expect(setError).toHaveBeenNthCalledWith(2, "lineItems.0.name", {
      type: "server",
      message: "Name is required.",
    });
  });
});

describe("applyApiErrorToForm", () => {
  it("uses validation issues when the API returns a validation_error payload", () => {
    const setError = vi.fn();

    applyApiErrorToForm(setError, {
      status: 400,
      message: "validation_error",
      code: "validation_error",
      issues: [{ path: ["subject"], message: "Subject is required." }],
    });

    expect(setError).toHaveBeenCalledWith("subject", {
      type: "server",
      message: "Subject is required.",
    });
  });

  it("falls back to the API message for non-validation errors", () => {
    const setError = vi.fn();

    applyApiErrorToForm(setError, {
      status: 500,
      message: "Server exploded.",
    });

    expect(setError).toHaveBeenCalledWith("root", {
      type: "server",
      message: "Server exploded.",
    });
  });
});
