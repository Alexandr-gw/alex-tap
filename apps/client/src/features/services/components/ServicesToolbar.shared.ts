export type ServicesToolbarActive = "all" | "active" | "inactive";

export type ServicesToolbarValue = {
    search: string;
    active: ServicesToolbarActive;
    sort: "name" | "-updatedAt" | "basePriceCents" | "durationMins";
};

export function toolbarActiveToBool(active: ServicesToolbarActive): boolean | undefined {
    if (active === "active") return true;
    if (active === "inactive") return false;
    return undefined;
}
