import { Prisma } from '@prisma/client';

export type DetailedJobRecord = Prisma.JobGetPayload<{
  include: {
    client: true;
    worker: {
      select: {
        id: true;
        displayName: true;
        colorTag: true;
        phone: true;
      };
    };
    assignments: {
      include: {
        worker: {
          select: {
            id: true;
            displayName: true;
            colorTag: true;
            phone: true;
          };
        };
      };
      orderBy: { createdAt: 'asc' };
    };
    lineItems: {
      include: {
        service: {
          select: {
            id: true;
            name: true;
            durationMins: true;
          };
        };
      };
      orderBy: { id: 'asc' };
    };
    comments: {
      include: {
        author: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
      orderBy: { createdAt: 'asc' };
    };
    payments: {
      orderBy: { createdAt: 'desc' };
      take: 20;
    };
  };
}>;

export type AccessContext = {
  isManager: boolean;
  workerId: string | null;
  userId: string;
  userName: string;
};

export type JobLineItemInput = {
  name: string;
  quantity: number;
  unitPriceCents: number;
  serviceId?: string | null;
};
