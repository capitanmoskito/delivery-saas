import type {
	CreateTenantInput,
	Tenant,
	TenantRepository,
	TenantStatus,
	UpdateTenantInput,
} from "./tenant.types";

const normalize = (value: string): string => value.trim();

const validateStatus = (status: TenantStatus | undefined): void => {
	if (status !== undefined && !status) {
		throw new Error("Tenant status is required when provided");
	}
};

const validateCreateInput = (input: CreateTenantInput): CreateTenantInput => {
	const businessName = normalize(input.businessName);
	const prefix = normalize(input.prefix).toLowerCase();
	const referralCode = normalize(input.referralCode).toUpperCase();

	if (!businessName || !prefix || !referralCode) {
		throw new Error("Tenant businessName, prefix, and referralCode are required");
	}

	validateStatus(input.status);

	return { ...input, businessName, prefix, referralCode };
};

const validateUpdateInput = (input: UpdateTenantInput): UpdateTenantInput => {
	const normalized: UpdateTenantInput = {
		...input,
		...(input.businessName === undefined
			? {}
			: { businessName: normalize(input.businessName) }),
		...(input.prefix === undefined
			? {}
			: { prefix: normalize(input.prefix).toLowerCase() }),
		...(input.referralCode === undefined
			? {}
			: { referralCode: normalize(input.referralCode).toUpperCase() }),
	};

	if (normalized.businessName === "" || normalized.prefix === "" || normalized.referralCode === "") {
		throw new Error("Tenant fields cannot be empty");
	}

	validateStatus(normalized.status);

	return normalized;
};

export class TenantService {
	public constructor(private readonly repository: TenantRepository) {}

	public create(input: CreateTenantInput): Promise<Tenant> {
		return this.repository.create(validateCreateInput(input));
	}

	public findById(id: string): Promise<Tenant | null> {
		const normalizedId = normalize(id);
		if (!normalizedId) {
			throw new Error("Tenant id is required");
		}

		return this.repository.findById(normalizedId);
	}

	public findByPrefix(prefix: string): Promise<Tenant | null> {
		const normalizedPrefix = normalize(prefix).toLowerCase();
		if (!normalizedPrefix) {
			throw new Error("Tenant prefix is required");
		}

		return this.repository.findByPrefix(normalizedPrefix);
	}

	public findByReferralCode(referralCode: string): Promise<Tenant | null> {
		const normalizedReferralCode = normalize(referralCode).toUpperCase();
		if (!normalizedReferralCode) {
			throw new Error("Tenant referralCode is required");
		}

		return this.repository.findByReferralCode(normalizedReferralCode);
	}

	public list(): Promise<Tenant[]> {
		return this.repository.list();
	}

	public update(id: string, input: UpdateTenantInput): Promise<Tenant> {
		const normalizedId = normalize(id);
		if (!normalizedId) {
			throw new Error("Tenant id is required");
		}

		return this.repository.update(normalizedId, validateUpdateInput(input));
	}
}
