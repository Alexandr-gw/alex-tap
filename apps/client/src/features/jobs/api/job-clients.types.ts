export type JobClientOption = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
};

export type JobClientListResponse = {
    items: JobClientOption[];
};
