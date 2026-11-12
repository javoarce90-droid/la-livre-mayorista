import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaCustomerRepository } from './prisma-customer-repository.js';

const row = {
  id: '6f1c1d0e-0000-4000-8000-000000000001',
  authUserId: null,
  email: 'compras@libreria.com',
  businessName: 'Librería del Puerto',
  taxId: '20123456786',
  phone: null,
  status: 'ACTIVE' as const,
  createdAt: new Date('2026-11-05T12:00:00Z'),
  updatedAt: new Date('2026-11-05T12:00:00Z'),
};

function repo(customer: Record<string, unknown>) {
  return new PrismaCustomerRepository({
    customer,
  } as unknown as PrismaClient);
}

function notFound() {
  return new Prisma.PrismaClientKnownRequestError('Record not found', {
    code: 'P2025',
    clientVersion: 'test',
  });
}

describe('PrismaCustomerRepository', () => {
  it('finds by email and by auth user id', async () => {
    const findUnique = vi.fn(async () => row);
    const customers = repo({ findUnique });

    expect(await customers.findByEmail('compras@libreria.com')).toEqual(row);
    expect(await customers.findByAuthUserId('u-1')).toEqual(row);
    expect(findUnique).toHaveBeenNthCalledWith(1, {
      where: { email: 'compras@libreria.com' },
    });
    expect(findUnique).toHaveBeenNthCalledWith(2, {
      where: { authUserId: 'u-1' },
    });
  });

  it('creates a customer with the given data', async () => {
    const create = vi.fn(async () => row);
    const data = {
      email: row.email,
      businessName: row.businessName,
      taxId: row.taxId,
      phone: null,
    };

    expect(await repo({ create }).create(data)).toEqual(row);
    expect(create).toHaveBeenCalledWith({ data });
  });

  it('links the auth user by customer id', async () => {
    const update = vi.fn(async () => ({ ...row, authUserId: 'u-1' }));

    const linked = await repo({ update }).linkAuthUser(row.id, 'u-1');

    expect(linked.authUserId).toBe('u-1');
    expect(update).toHaveBeenCalledWith({
      where: { id: row.id },
      data: { authUserId: 'u-1' },
    });
  });

  it('sets the status by email and returns null when the email is unknown', async () => {
    const update = vi
      .fn()
      .mockResolvedValueOnce({ ...row, status: 'SUSPENDED' })
      .mockRejectedValueOnce(notFound());
    const customers = repo({ update });

    expect((await customers.setStatus(row.email, 'SUSPENDED'))?.status).toBe(
      'SUSPENDED',
    );
    expect(update).toHaveBeenCalledWith({
      where: { email: row.email },
      data: { status: 'SUSPENDED' },
    });
    expect(await customers.setStatus('nadie@x.com', 'ACTIVE')).toBeNull();
  });

  it('rethrows other database errors', async () => {
    const update = vi.fn(async () => {
      throw new Error('db down');
    });
    await expect(
      repo({ update }).setStatus(row.email, 'ACTIVE'),
    ).rejects.toThrow('db down');
  });

  it('lists customers ordered by business name', async () => {
    const findMany = vi.fn(async () => [row]);

    expect(await repo({ findMany }).list()).toEqual([row]);
    expect(findMany).toHaveBeenCalledWith({
      orderBy: [{ businessName: 'asc' }, { email: 'asc' }],
    });
  });
});
