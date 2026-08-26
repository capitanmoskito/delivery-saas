import { prisma } from "@/src/lib/prisma";
import type { Prisma, TenantStatus as PrismaTenantStatus } from "@prisma/client";

import type {
	CreateTenantInput,
	Tenant,
	TenantRepository,
	TenantStatus,
	UpdateTenantInput,
} from "./tenant.types";

const tenantSelect = {
	id: true,
	businessName: true,
	prefix: true,
	referralCode: true,
	status: true,
	trialEndsAt: true,
	createdAt: true,
	updatedAt: true,
} satisfies Prisma.TenantSelect;

type SelectedTenant = Prisma.TenantGetPayload<{
	select: typeof tenantSelect;
}>;

const toDomain = (tenant: SelectedTenant): Tenant => ({
	...tenant,
	status: tenant.status as TenantStatus,
});

const toPrismaStatus = (status: TenantStatus): PrismaTenantStatus => status;

export const tenantRepository: TenantRepository = {
	async create(input: CreateTenantInput): Promise<Tenant> {
		const tenant = await prisma.tenant.create({
			data: {
				businessName: input.businessName,
				prefix: input.prefix,
				referralCode: input.referralCode,
				status: toPrismaStatus(input.status ?? "trial"),
				trialEndsAt: input.trialEndsAt ?? null,
			},
			select: tenantSelect,
		});

		return toDomain(tenant);
	},

	async findById(id: string): Promise<Tenant | null> {
		const tenant = await prisma.tenant.findUnique({
			where: { id },
			select: tenantSelect,
		});

		return tenant ? toDomain(tenant) : null;
	},

	async findByPrefix(prefix: string): Promise<Tenant | null> {
		const tenant = await prisma.tenant.findUnique({
			where: { prefix },
			select: tenantSelect,
		});

		return tenant ? toDomain(tenant) : null;
	},

	async findByReferralCode(referralCode: string): Promise<Tenant | null> {
		const tenant = await prisma.tenant.findUnique({
			where: { referralCode },
			select: tenantSelect,
		});

		return tenant ? toDomain(tenant) : null;
	},

	async list(): Promise<Tenant[]> {
		const tenants = await prisma.tenant.findMany({
			orderBy: { createdAt: "desc" },
			select: tenantSelect,
		});

		return tenants.map(toDomain);
	},

	async update(id: string, input: UpdateTenantInput): Promise<Tenant> {
		const tenant = await prisma.tenant.update({
			where: { id },
			data: {
				...(input.businessName === undefined
					? {}
					: { businessName: input.businessName }),
				...(input.prefix === undefined ? {} : { prefix: input.prefix }),
				...(input.referralCode === undefined
					? {}
					: { referralCode: input.referralCode }),
				...(input.status === undefined
					? {}
					: { status: toPrismaStatus(input.status) }),
				...(input.trialEndsAt === undefined
					? {}
					: { trialEndsAt: input.trialEndsAt }),
			},
			select: tenantSelect,
		});

		return toDomain(tenant);
	},
};
