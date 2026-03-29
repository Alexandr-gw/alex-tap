import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createJob } from "../api/create-job.api";
import type { CreateJobInput } from "../api/create-job.types";

export function useCreateJob() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateJobInput) => createJob(input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["schedule"] });
            qc.invalidateQueries({ queryKey: ["jobs"] });
        },
    });
}
