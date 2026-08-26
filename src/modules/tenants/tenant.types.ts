export const tenantStatuses = [
	"trial",
	"pending_payment",
	"active",
	"suspended",
	"cancelled",
] as const;

export type TenantStatus = (typeof tenantStatuses)[number];

export type Tenant = {
	id: string;
	businessName: string;
	prefix: string;
	referralCode: string;
	status: TenantStatus;
	trialEndsAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type CreateTenantInput = {
	businessName: string;
	prefix: string;
	referralCode: string;
	status?: TenantStatus;
	trialEndsAt?: Date | null;
};

export type UpdateTenantInput = Partial<
	Pick<
		Tenant,
		"businessName" | "prefix" | "referralCode" | "status" | "trialEndsAt"
	>
>;

export type TenantRepository = {
	create(input: CreateTenantInput): Promise<Tenant>;
	findById(id: string): Promise<Tenant | null>;
	findByPrefix(prefix: string): Promise<Tenant | null>;
	findByReferralCode(referralCode: string): Promise<Tenant | null>;
	list(): Promise<Tenant[]>;
	update(id: string, input: UpdateTenantInput): Promise<Tenant>;
};
