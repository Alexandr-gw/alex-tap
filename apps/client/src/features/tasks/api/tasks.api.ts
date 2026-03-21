import { api } from "@/lib/api/apiClient";
import type {
    CreateTaskInput,
    TaskCustomerOption,
    TaskDto,
    TasksListParams,
    TasksListResponse,
    UpdateTaskInput,
} from "./tasks.types";

const TASKS_BASE = "/api/v1/tasks";

function qs(params: TasksListParams = {}) {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (typeof value === "undefined" || value === null || value === "") return;
        search.set(key, String(value));
    });

    const out = search.toString();
    return out ? `?${out}` : "";
}

export function getTasks(params: TasksListParams = {}) {
    return api<TasksListResponse>(`${TASKS_BASE}${qs(params)}`);
}

export function getTaskCustomers() {
    return api<TaskCustomerOption[]>(`${TASKS_BASE}/customers`);
}

export function createTask(input: CreateTaskInput) {
    return api<TaskDto, CreateTaskInput>(TASKS_BASE, {
        method: "POST",
        body: input,
    });
}

export function updateTask(taskId: string, input: UpdateTaskInput) {
    return api<TaskDto, UpdateTaskInput>(`${TASKS_BASE}/${taskId}`, {
        method: "PATCH",
        body: input,
    });
}

export function deleteTask(taskId: string) {
    return api<{ ok: true }>(`${TASKS_BASE}/${taskId}`, {
        method: "DELETE",
    });
}

