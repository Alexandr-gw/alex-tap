jest.mock('@/common/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { Role } from '@prisma/client';
import { MeController } from './me.controller';

describe('MeController', () => {
  const prisma = {
    user: {
      upsert: jest.fn(),
    },
    membership: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
  };

  const cfg = {
    get: jest.fn(),
  };

  const makeController = () => new MeController(prisma as any, cfg as any);

  beforeEach(() => {
    jest.resetAllMocks();

    cfg.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        KEYCLOAK_CLIENT_ID: 'web-app',
        PUBLIC_DEMO_AUTO_PROVISION: 'true',
        PUBLIC_DEMO_COMPANY_ID: 'demo-company',
      };

      return values[key];
    });

    prisma.user.upsert.mockResolvedValue({
      id: 'user_1',
      sub: 'social_sub_1',
      email: 'social@example.com',
      name: 'Social User',
    });
    prisma.membership.findFirst.mockResolvedValue(null);
    prisma.company.findUnique.mockResolvedValue({ id: 'demo-company' });
    prisma.membership.upsert.mockResolvedValue({
      id: 'membership_1',
      companyId: 'demo-company',
      userId: 'user_1',
      role: Role.MANAGER,
    });
    prisma.membership.findMany.mockResolvedValue([
      {
        role: Role.MANAGER,
        companyId: 'demo-company',
        company: {
          id: 'demo-company',
          name: 'Alex Tap Home Services',
          timezone: 'America/Edmonton',
        },
      },
    ]);
  });

  it('auto-assigns public demo membership for a social login without app roles', async () => {
    const result = await makeController().me(
      {
        sub: 'social_sub_1',
        email: 'social@example.com',
        preferred_username: 'social-user',
        realm_access: {
          roles: [
            'manage-account',
            'manage-account-links',
            'view-profile',
            'default-roles-alex-tap',
            'offline_access',
            'uma_authorization',
          ],
        },
      },
      null,
    );

    expect(prisma.membership.upsert).toHaveBeenCalledWith({
      where: {
        companyId_userId: {
          companyId: 'demo-company',
          userId: 'user_1',
        },
      },
      update: {
        role: Role.MANAGER,
      },
      create: {
        companyId: 'demo-company',
        userId: 'user_1',
        role: Role.MANAGER,
      },
    });
    expect(result.activeCompanyId).toBe('demo-company');
    expect(result.memberships).toEqual([
      {
        companyId: 'demo-company',
        companyName: 'Alex Tap Home Services',
        role: Role.MANAGER,
      },
    ]);
  });
});
