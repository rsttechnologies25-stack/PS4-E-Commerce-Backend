-- Enable RLS on all tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- Admin Bypass Policy (Apply to all tables)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'CREATE POLICY ' || quote_ident('admin_bypass_' || r.tablename) || ' ON ' || quote_ident(r.tablename) || ' FOR ALL USING (current_setting(''app.is_admin'', TRUE) = ''true'')';
    END LOOP;
END $$;

-- User Policies (Owner access)

-- User table: Users can only see/update their own profile
CREATE POLICY "user_self_access" ON "User" FOR ALL USING (id = current_setting('app.current_user_id', TRUE));

-- CartItem table: Users can only see/manage their own cart
CREATE POLICY "user_cart_access" ON "CartItem" FOR ALL USING ("userId" = current_setting('app.current_user_id', TRUE));

-- Order table: Users can only see their own orders
CREATE POLICY "user_order_access" ON "Order" FOR ALL USING ("userId" = current_setting('app.current_user_id', TRUE));

-- OrderItem table: Users can only see items from their own orders (JOIN check)
CREATE POLICY "user_order_item_access" ON "OrderItem" FOR ALL USING (
    EXISTS (SELECT 1 FROM "Order" WHERE "Order".id = "OrderItem"."orderId" AND "Order"."userId" = current_setting('app.current_user_id', TRUE))
);

-- Notification table: Users can only see their own notifications
CREATE POLICY "user_notification_access" ON "Notification" FOR ALL USING ("userId" = current_setting('app.current_user_id', TRUE));

-- Review table: Users can only manage their own reviews
CREATE POLICY "user_review_access" ON "Review" FOR ALL USING ("userId" = current_setting('app.current_user_id', TRUE));

-- Public Read-Only Policies (For items like Products, Categories, Branches, etc.)
-- Most tables are read-only for public if not admin.

CREATE POLICY "public_read_products" ON "Product" FOR SELECT USING (true);
CREATE POLICY "public_read_categories" ON "Category" FOR SELECT USING (true);
CREATE POLICY "public_read_product_images" ON "ProductImage" FOR SELECT USING (true);
CREATE POLICY "public_read_variants" ON "ProductVariant" FOR SELECT USING (true);
CREATE POLICY "public_read_branches" ON "Branch" FOR SELECT USING (true);
CREATE POLICY "public_read_announcements" ON "Announcement" FOR SELECT USING (true);
CREATE POLICY "public_read_hero_banners" ON "HeroBanner" FOR SELECT USING (true);
CREATE POLICY "public_read_site_settings" ON "SiteSettings" FOR SELECT USING (true);
CREATE POLICY "public_read_coupons" ON "Coupon" FOR SELECT USING (true);
CREATE POLICY "public_read_shipping_rules" ON "ShippingRule" FOR SELECT USING (true);

-- BannedEmail and WhatsAppTemplate should be Admin-Only (Already covered by admin_bypass)
-- Since RLS is enabled and no public policy is added, they will be inaccessible to non-admins.
