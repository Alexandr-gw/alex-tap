import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createTask,
    deleteTask,
    getTaskCustomers,
    getTasks,
    updateTask,
} from "../api/tasks.api";
import type {
    CreateTaskInput,
    TasksListParams,
    UpdateTaskInput,
} from "../api/tasks.types";

export function useTasks(params: TasksListParams) {
    return useQuery({
        queryKey: ["tasks", params],
        queryFn: () => getTasks(params),
    });
}

export function useTaskCustomers(enabled = true) {
    return useQuery({
        queryKey: ["task-customers"],
        queryFn: getTaskCustomers,
        enabled,
    });
}

export function useCreateTask() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateTaskInput) => createTask(input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
}

export function useUpdateTask() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) =>
            updateTask(taskId, input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
}

export function useDeleteTask() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (taskId: string) => deleteTask(taskId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
}
