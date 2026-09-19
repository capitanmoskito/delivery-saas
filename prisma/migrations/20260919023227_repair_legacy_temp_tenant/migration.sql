DO $$
DECLARE
	target_tenant_id TEXT;
BEGIN
	SELECT MIN("id")
	INTO target_tenant_id
	FROM "public"."tenants";

	IF target_tenant_id IS NOT NULL
		 AND (SELECT COUNT(*) FROM "public"."tenants") = 1 THEN
		UPDATE "public"."categories"
		SET "tenantId" = target_tenant_id
		WHERE "tenantId" = 'TEMP';

		UPDATE "public"."products"
		SET "tenantId" = target_tenant_id
		WHERE "tenantId" = 'TEMP';

		UPDATE "public"."product_variants"
		SET "tenantId" = target_tenant_id
		WHERE "tenantId" = 'TEMP';
	END IF;
END $$;
-- This is an empty migration.