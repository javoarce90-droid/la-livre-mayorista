-- Supabase exposes the "public" schema through its Data API (PostgREST),
-- reachable with the public anon key. Enabling RLS without policies denies
-- all access through that API. The NestJS API connects as a role that
-- bypasses RLS, so it is unaffected.
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Publisher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Book" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookContributor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupplierOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PricingRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
