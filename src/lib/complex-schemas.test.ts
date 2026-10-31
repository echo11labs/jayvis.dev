import { describe, it, expect } from 'vitest';
import { parseDbml } from '../../mini-services/dbml-parser';
import { layoutDiagram, estimateNodeDimensions } from './layout/elk-layout';
import { diffSchema } from './diff/schema-diff';
import { exportDDL } from './export/ddl';
import { buildSqlScript } from './export/ddl-sqlite';
import { validateSchema } from './validation/schema-validation';
import type { DatabaseAST, SchemaTable } from '@/types/ast';

// Helper to check 2D bounding-box collisions
function detectOverlaps(nodes: any[]): Array<{ a: string; b: string }> {
  const collisions: Array<{ a: string; b: string }> = [];
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const aDim = estimateNodeDimensions(a);
    const aBox = { x1: a.position.x, y1: a.position.y, x2: a.position.x + aDim.width, y2: a.position.y + aDim.height };

    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const bDim = estimateNodeDimensions(b);
      const bBox = { x1: b.position.x, y1: b.position.y, x2: b.position.x + bDim.width, y2: b.position.y + bDim.height };

      // Overlap condition: both X and Y ranges intersect
      const overlapX = aBox.x1 < bBox.x2 && aBox.x2 > bBox.x1;
      const overlapY = aBox.y1 < bBox.y2 && aBox.y2 > bBox.y1;
      if (overlapX && overlapY) {
        collisions.push({ a: a.id, b: b.id });
      }
    }
  }
  return collisions;
}

// -------------------------------------------------------------
// COMPLEX FILE 1: 52-Table Enterprise E-Commerce & Logistics
// Contains: TableGroups, Enums, Composite PKs, JSONB, Arrays, Decimals
// -------------------------------------------------------------
const COMPLEX_ECOMMERCE_DBML = `
enum order_status {
  pending
  processing
  shipped
  delivered
  cancelled
  refunded
}

enum user_role {
  customer
  support
  admin
  vendor
}

enum payment_method {
  credit_card
  paypal
  stripe
  apple_pay
  crypto
}

TableGroup identity_auth {
  users
  profiles
  user_sessions
  user_roles
  roles
  permissions
  role_permissions
}

TableGroup product_catalog {
  categories
  products
  product_variants
  variant_options
  attributes
  attribute_values
  product_images
  product_reviews
  tags
  product_tags
}

TableGroup orders_checkout {
  orders
  order_items
  order_status_history
  invoices
  invoice_lines
  shipments
  shipment_items
  coupons
  order_coupons
}

TableGroup payments_billing {
  payment_accounts
  transactions
  payment_attempts
  refunds
  payouts
}

TableGroup inventory_warehouse {
  warehouses
  warehouse_locations
  inventory_levels
  inventory_adjustments
  stock_transfers
  suppliers
  purchase_orders
  purchase_order_items
}

TableGroup marketing_analytics {
  campaigns
  promotions
  customer_segments
  events
  user_events
  ab_tests
  ab_variants
  ab_assignments
}

Table users {
  id integer [pk, increment]
  email varchar(255) [unique, not null]
  encrypted_password varchar(255) [not null]
  default_currency char(3) [default: 'USD']
  is_active boolean [default: true]
  created_at timestamp [default: \`now()\`]
  updated_at timestamp [default: \`now()\`]
}

Table profiles {
  id integer [pk, increment]
  user_id integer [unique, not null]
  first_name varchar(100)
  last_name varchar(100)
  bio text
  phone_number varchar(20)
  metadata jsonb
}

Table user_sessions {
  id uuid [pk]
  user_id integer [not null]
  ip_address inet
  user_agent text
  expires_at timestamp [not null]
}

Table roles {
  id integer [pk, increment]
  name varchar(50) [unique, not null]
  description text
}

Table user_roles {
  user_id integer [not null]
  role_id integer [not null]
  assigned_at timestamp [default: \`now()\`]
  indexes {
    (user_id, role_id) [pk]
  }
}

Table permissions {
  id integer [pk, increment]
  code varchar(100) [unique, not null]
}

Table role_permissions {
  role_id integer [not null]
  permission_id integer [not null]
  indexes {
    (role_id, permission_id) [pk]
  }
}

Table categories {
  id integer [pk, increment]
  parent_id integer
  name varchar(100) [not null]
  slug varchar(100) [unique, not null]
}

Table products {
  id integer [pk, increment]
  category_id integer [not null]
  name varchar(255) [not null]
  sku varchar(64) [unique, not null]
  base_price decimal(10,2) [not null]
  is_published boolean [default: false]
  tags_list text[]
  created_at timestamp [default: \`now()\`]
}

Table product_variants {
  id integer [pk, increment]
  product_id integer [not null]
  sku varchar(64) [unique, not null]
  price_adjustment decimal(10,2) [default: 0.0]
  weight_grams real
}

Table variant_options {
  id integer [pk, increment]
  variant_id integer [not null]
  attribute_value_id integer [not null]
}

Table attributes {
  id integer [pk, increment]
  name varchar(50) [not null]
}

Table attribute_values {
  id integer [pk, increment]
  attribute_id integer [not null]
  value varchar(100) [not null]
}

Table product_images {
  id integer [pk, increment]
  product_id integer [not null]
  url text [not null]
  sort_order integer [default: 0]
}

Table product_reviews {
  id integer [pk, increment]
  product_id integer [not null]
  user_id integer [not null]
  rating smallint [not null]
  comment text
  created_at timestamp [default: \`now()\`]
}

Table tags {
  id integer [pk, increment]
  slug varchar(50) [unique, not null]
}

Table product_tags {
  product_id integer [not null]
  tag_id integer [not null]
  indexes {
    (product_id, tag_id) [pk]
  }
}

Table orders {
  id integer [pk, increment]
  user_id integer [not null]
  status order_status [default: 'pending']
  total_amount decimal(12,2) [not null]
  created_at timestamp [default: \`now()\`]
}

Table order_items {
  id integer [pk, increment]
  order_id integer [not null]
  product_variant_id integer [not null]
  quantity integer [not null, default: 1]
  unit_price decimal(10,2) [not null]
}

Table order_status_history {
  id integer [pk, increment]
  order_id integer [not null]
  status order_status [not null]
  changed_at timestamp [default: \`now()\`]
}

Table invoices {
  id integer [pk, increment]
  order_id integer [unique, not null]
  invoice_number varchar(64) [unique, not null]
  amount_due decimal(12,2) [not null]
  issued_at timestamp [default: \`now()\`]
}

Table invoice_lines {
  id integer [pk, increment]
  invoice_id integer [not null]
  description text [not null]
  amount decimal(10,2) [not null]
}

Table shipments {
  id integer [pk, increment]
  order_id integer [not null]
  tracking_number varchar(100)
  carrier varchar(50)
  dispatched_at timestamp
}

Table shipment_items {
  id integer [pk, increment]
  shipment_id integer [not null]
  order_item_id integer [not null]
  quantity integer [not null]
}

Table coupons {
  id integer [pk, increment]
  code varchar(50) [unique, not null]
  discount_percentage decimal(5,2)
}

Table order_coupons {
  order_id integer [not null]
  coupon_id integer [not null]
  discount_applied decimal(10,2) [not null]
  indexes {
    (order_id, coupon_id) [pk]
  }
}

Table payment_accounts {
  id integer [pk, increment]
  user_id integer [not null]
  method payment_method [not null]
  provider_id varchar(100)
  is_default boolean [default: false]
}

Table transactions {
  id uuid [pk]
  order_id integer [not null]
  account_id integer [not null]
  amount decimal(12,2) [not null]
  created_at timestamp [default: \`now()\`]
}

Table payment_attempts {
  id uuid [pk]
  transaction_id uuid [not null]
  status varchar(30) [not null]
  error_code varchar(50)
  attempted_at timestamp [default: \`now()\`]
}

Table refunds {
  id integer [pk, increment]
  transaction_id uuid [not null]
  amount decimal(10,2) [not null]
  reason text
  created_at timestamp [default: \`now()\`]
}

Table payouts {
  id integer [pk, increment]
  account_id integer [not null]
  amount decimal(12,2) [not null]
  settled_at timestamp
}

Table warehouses {
  id integer [pk, increment]
  name varchar(100) [not null]
  code varchar(20) [unique, not null]
}

Table warehouse_locations {
  id integer [pk, increment]
  warehouse_id integer [not null]
  aisle varchar(10)
  shelf varchar(10)
}

Table inventory_levels {
  id integer [pk, increment]
  warehouse_id integer [not null]
  variant_id integer [not null]
  quantity_on_hand integer [default: 0]
}

Table inventory_adjustments {
  id integer [pk, increment]
  inventory_level_id integer [not null]
  delta integer [not null]
  reason text
  created_at timestamp [default: \`now()\`]
}

Table stock_transfers {
  id integer [pk, increment]
  source_warehouse_id integer [not null]
  target_warehouse_id integer [not null]
  variant_id integer [not null]
  quantity integer [not null]
}

Table suppliers {
  id integer [pk, increment]
  name varchar(150) [not null]
  contact_email varchar(100)
}

Table purchase_orders {
  id integer [pk, increment]
  supplier_id integer [not null]
  status varchar(30) [default: 'draft']
  created_at timestamp [default: \`now()\`]
}

Table purchase_order_items {
  id integer [pk, increment]
  purchase_order_id integer [not null]
  variant_id integer [not null]
  quantity_ordered integer [not null]
}

Table campaigns {
  id integer [pk, increment]
  name varchar(100) [not null]
  budget decimal(12,2)
}

Table promotions {
  id integer [pk, increment]
  campaign_id integer [not null]
  name varchar(100) [not null]
}

Table customer_segments {
  id integer [pk, increment]
  name varchar(100) [unique, not null]
  query_definition jsonb
}

Table events {
  id integer [pk, increment]
  name varchar(50) [unique, not null]
}

Table user_events {
  id bigint [pk, increment]
  user_id integer [not null]
  event_id integer [not null]
  payload jsonb
  occurred_at timestamp [default: \`now()\`]
}

Table ab_tests {
  id integer [pk, increment]
  name varchar(100) [unique, not null]
  is_running boolean [default: true]
}

Table ab_variants {
  id integer [pk, increment]
  test_id integer [not null]
  name varchar(50) [not null]
}

Table ab_assignments {
  id integer [pk, increment]
  variant_id integer [not null]
  user_id integer [not null]
  assigned_at timestamp [default: \`now()\`]
}

// Relationships
Ref: profiles.user_id - users.id
Ref: user_sessions.user_id > users.id
Ref: user_roles.user_id > users.id
Ref: user_roles.role_id > roles.id
Ref: role_permissions.role_id > roles.id
Ref: role_permissions.permission_id > permissions.id
Ref: categories.parent_id > categories.id
Ref: products.category_id > categories.id
Ref: product_variants.product_id > products.id
Ref: variant_options.variant_id > product_variants.id
Ref: variant_options.attribute_value_id > attribute_values.id
Ref: attribute_values.attribute_id > attributes.id
Ref: product_images.product_id > products.id
Ref: product_reviews.product_id > products.id
Ref: product_reviews.user_id > users.id
Ref: product_tags.product_id > products.id
Ref: product_tags.tag_id > tags.id
Ref: orders.user_id > users.id
Ref: order_items.order_id > orders.id
Ref: order_items.product_variant_id > product_variants.id
Ref: order_status_history.order_id > orders.id
Ref: invoices.order_id - orders.id
Ref: invoice_lines.invoice_id > invoices.id
Ref: shipments.order_id > orders.id
Ref: shipment_items.shipment_id > shipments.id
Ref: shipment_items.order_item_id > order_items.id
Ref: order_coupons.order_id > orders.id
Ref: order_coupons.coupon_id > coupons.id
Ref: payment_accounts.user_id > users.id
Ref: transactions.order_id > orders.id
Ref: transactions.account_id > payment_accounts.id
Ref: payment_attempts.transaction_id > transactions.id
Ref: refunds.transaction_id > transactions.id
Ref: payouts.account_id > payment_accounts.id
Ref: warehouse_locations.warehouse_id > warehouses.id
Ref: inventory_levels.warehouse_id > warehouses.id
Ref: inventory_levels.variant_id > product_variants.id
Ref: inventory_adjustments.inventory_level_id > inventory_levels.id
Ref: stock_transfers.source_warehouse_id > warehouses.id
Ref: stock_transfers.target_warehouse_id > warehouses.id
Ref: stock_transfers.variant_id > product_variants.id
Ref: purchase_orders.supplier_id > suppliers.id
Ref: purchase_order_items.purchase_order_id > purchase_orders.id
Ref: purchase_order_items.variant_id > product_variants.id
Ref: promotions.campaign_id > campaigns.id
Ref: user_events.user_id > users.id
Ref: user_events.event_id > events.id
Ref: ab_variants.test_id > ab_tests.id
Ref: ab_assignments.variant_id > ab_variants.id
Ref: ab_assignments.user_id > users.id
`;

// -------------------------------------------------------------
// COMPLEX FILE 2: Multi-Tenant SaaS with Circular & Self-Refs
// -------------------------------------------------------------
const COMPLEX_SAAS_DBML = `
Table organizations {
  id uuid [pk]
  name varchar(255) [not null]
  slug varchar(100) [unique, not null]
  current_subscription_id uuid
}

Table subscriptions {
  id uuid [pk]
  organization_id uuid [not null]
  plan varchar(50) [not null]
  active boolean [default: true]
}

Table members {
  id uuid [pk]
  org_id uuid [not null]
  user_email varchar(255) [not null]
  manager_id uuid
  reports_to uuid
}

Table projects {
  id uuid [pk]
  org_id uuid [not null]
  lead_id uuid
  parent_project_id uuid
}

Ref: organizations.current_subscription_id - subscriptions.id
Ref: subscriptions.organization_id > organizations.id
Ref: members.org_id > organizations.id
Ref: members.manager_id > members.id
Ref: members.reports_to > members.id
Ref: projects.org_id > organizations.id
Ref: projects.lead_id > members.id
Ref: projects.parent_project_id > projects.id
`;

// -------------------------------------------------------------
// COMPLEX FILE 3: AI Vector, GIS, & Advanced SQL Types
// -------------------------------------------------------------
const COMPLEX_ADVANCED_TYPES_DBML = `
Table document_embeddings {
  id bigint [pk, increment]
  doc_id uuid [not null]
  embedding vector(1536) [not null]
  metadata jsonb
  content_hash char(64) [not null]
  ip_source inet
  is_active bit(1) [default: '1']
  rating decimal(3,2) [default: 0.0]
  tags varchar(50)[]
  created_at timestamptz [default: \`now()\`]
}

Table geo_locations {
  id integer [pk, increment]
  name varchar(100) [not null]
  coordinates geometry [not null]
  boundary geography
}

Table spatial_links {
  id integer [pk, increment]
  source_id integer [not null]
  target_id integer [not null]
  distance double precision
}

Ref: spatial_links.source_id > geo_locations.id
Ref: spatial_links.target_id > geo_locations.id
`;

describe('Comprehensive Complex Files & Performance Suite', () => {
  it('parses, lays out, diffs, and exports 47-table enterprise e-commerce schema with high performance', async () => {
    // 1. Parsing performance
    const startParse = performance.now();
    const parseResult = parseDbml(COMPLEX_ECOMMERCE_DBML);
    const parseDuration = performance.now() - startParse;

    expect(parseResult.error).toBeNull();
    expect(Object.keys(parseResult.ast.tables).length).toBe(47);
    expect(Object.keys(parseResult.ast.tableGroups).length).toBe(6);
    expect(parseResult.edges.length).toBeGreaterThanOrEqual(40);
    expect(parseDuration).toBeLessThan(1500); // Fast parse under load

    const ast = parseResult.ast as DatabaseAST;

    // 2. Schema Validation check
    const issues = validateSchema(ast);
    // Should have zero critical circular / broken reference issues
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBe(0);

    // 3. Compact Layout Performance & Collision-Free Guarantee (Groups: Off)
    const startLayoutCompact = performance.now();
    const compactResult = await layoutDiagram(parseResult.nodes, parseResult.edges, {
      groupByDomain: false,
    });
    const layoutCompactDuration = performance.now() - startLayoutCompact;

    expect(compactResult.nodes.length).toBe(47);
    expect(layoutCompactDuration).toBeLessThan(1000); // Fast layout for 47 nodes with ELK

    // Zero 2D bounding-box collisions
    const compactCollisions = detectOverlaps(compactResult.nodes);
    expect(compactCollisions).toEqual([]);

    // 4. Pod Layout Performance & Collision-Free Guarantee (Groups: On)
    const startLayoutGrouped = performance.now();
    const groupedResult = await layoutDiagram(parseResult.nodes, parseResult.edges, {
      groupByDomain: true,
      tableGroups: ast.tableGroups,
    });
    const layoutGroupedDuration = performance.now() - startLayoutGrouped;

    expect(groupedResult.nodes.length).toBe(47);
    expect(layoutGroupedDuration).toBeLessThan(800);

    const groupedCollisions = detectOverlaps(groupedResult.nodes);
    expect(groupedCollisions).toEqual([]);

    // 5. PostgreSQL DDL Export Completeness
    const startDdl = performance.now();
    const pgDdl = exportDDL(ast);
    const ddlDuration = performance.now() - startDdl;

    expect(ddlDuration).toBeLessThan(100);
    expect(pgDdl).toContain('CREATE TYPE "order_status" AS ENUM');
    expect(pgDdl).toContain('CREATE TABLE "users" (');
    expect(pgDdl).toContain('"default_currency" char(3)');
    expect(pgDdl).toContain('PRIMARY KEY ("user_id", "role_id")');
    expect(pgDdl).toContain('ALTER TABLE "profiles" ADD CONSTRAINT "fk_profiles_user_id"');

    // 6. SQLite DDL Export Completeness
    const sqliteSql = buildSqlScript(ast);
    expect(sqliteSql).toContain('CREATE TABLE "users" (');
    expect(sqliteSql).toContain('CHECK ("status" IN');

    // 7. Migration Diff Performance on complex schema modification
    const modifiedAst: DatabaseAST = JSON.parse(JSON.stringify(ast));
    // Add a new column to users
    modifiedAst.tables['users'].fields.push({
      id: 'users.loyalty_tier',
      name: 'loyalty_tier',
      type: 'varchar(20)',
      constraints: { isNullable: true },
    });
    // Add a new table
    modifiedAst.tables['loyalty_rewards'] = {
      id: 'loyalty_rewards',
      name: 'loyalty_rewards',
      fields: [
        { id: 'loyalty_rewards.id', name: 'id', type: 'integer', constraints: { isPrimaryKey: true } },
        { id: 'loyalty_rewards.user_id', name: 'user_id', type: 'integer', constraints: { isNullable: false } },
        { id: 'loyalty_rewards.points', name: 'points', type: 'integer', constraints: { isNullable: false } },
      ],
      primaryKey: ['id'],
    };

    const startDiff = performance.now();
    const diff = diffSchema(ast, modifiedAst);
    const diffDuration = performance.now() - startDiff;

    expect(diffDuration).toBeLessThan(50);
    expect(diff.upSql.join('\n')).toContain('ALTER TABLE "users" ADD COLUMN "loyalty_tier" varchar(20);');
    expect(diff.upSql.join('\n')).toContain('CREATE TABLE "loyalty_rewards" (');
    expect(diff.downSql.join('\n')).toContain('DROP TABLE IF EXISTS "loyalty_rewards" CASCADE;');
    expect(diff.downSql.join('\n')).toContain('ALTER TABLE "users" DROP COLUMN "loyalty_tier";');
  });

  it('handles SaaS schema with circular and self-referential relations without infinite loops or overlap', async () => {
    const parseResult = parseDbml(COMPLEX_SAAS_DBML);
    expect(parseResult.error).toBeNull();
    expect(Object.keys(parseResult.ast.tables).length).toBe(4);

    const laid = await layoutDiagram(parseResult.nodes, parseResult.edges, {
      groupByDomain: false,
    });
    expect(laid.nodes.length).toBe(4);
    const collisions = detectOverlaps(laid.nodes);
    expect(collisions).toEqual([]);

    const ddl = exportDDL(parseResult.ast as DatabaseAST);
    expect(ddl).toContain('ALTER TABLE "organizations" ADD CONSTRAINT "fk_organizations_current_subscription_id"');
    expect(ddl).toContain('ALTER TABLE "members" ADD CONSTRAINT "fk_members_manager_id"');
    expect(ddl).toContain('ALTER TABLE "projects" ADD CONSTRAINT "fk_projects_parent_project_id"');
  });

  it('handles advanced AI and GIS types (vector, geometry, bit, timestamptz, arrays) gracefully without crash', async () => {
    const parseResult = parseDbml(COMPLEX_ADVANCED_TYPES_DBML);
    expect(parseResult.error).toBeNull();
    expect(Object.keys(parseResult.ast.tables).length).toBe(3);

    const ddl = exportDDL(parseResult.ast as DatabaseAST);
    expect(ddl).toContain('"embedding" vector(1536)');
    expect(ddl).toContain('"coordinates" geometry');
    expect(ddl).toContain('"boundary" geography');
    expect(ddl).toContain('"tags" varchar(50)[]');

    const sqliteSql = buildSqlScript(parseResult.ast as DatabaseAST);
    expect(sqliteSql).toContain('"embedding" TEXT'); // Affined safely to TEXT in SQLite
  });

  it('stress tests a 100-table enterprise schema with 180 relations across 10 domains', async () => {
    // Generate 100 tables across 10 domains
    const domains = [
      'auth', 'billing', 'inventory', 'orders', 'notifications',
      'shipping', 'analytics', 'catalog', 'marketing', 'support',
    ];
    const dbmlLines: string[] = [];

    // Define table groups
    for (const d of domains) {
      dbmlLines.push(`TableGroup ${d}_domain {`);
      for (let i = 1; i <= 10; i++) {
        dbmlLines.push(`  ${d}_entity_${i}`);
      }
      dbmlLines.push('}\n');
    }

    // Define 100 tables
    for (const d of domains) {
      for (let i = 1; i <= 10; i++) {
        const tbl = `${d}_entity_${i}`;
        dbmlLines.push(`Table ${tbl} {`);
        dbmlLines.push(`  id integer [pk, increment]`);
        dbmlLines.push(`  name varchar(100) [not null]`);
        dbmlLines.push(`  metadata jsonb`);
        dbmlLines.push(`  status varchar(20) [default: 'active']`);
        if (i > 1) {
          dbmlLines.push(`  parent_id integer`);
        }
        dbmlLines.push('}\n');
      }
    }

    // Add inter-table and cross-domain foreign keys (180 relations)
    for (const d of domains) {
      for (let i = 2; i <= 10; i++) {
        dbmlLines.push(`Ref: ${d}_entity_${i}.parent_id > ${d}_entity_${i - 1}.id`);
      }
    }
    // Cross-domain relations: orders -> billing, shipping -> orders, etc.
    for (let i = 1; i <= 10; i++) {
      dbmlLines.push(`Ref: orders_entity_${i}.id > billing_entity_${i}.id`);
      dbmlLines.push(`Ref: shipping_entity_${i}.id > orders_entity_${i}.id`);
      dbmlLines.push(`Ref: notifications_entity_${i}.id > auth_entity_${i}.id`);
    }

    const fullDbml = dbmlLines.join('\n');

    // 1. Parse 100 tables
    const startParse = performance.now();
    const parsed = parseDbml(fullDbml);
    const parseTime = performance.now() - startParse;

    expect(parsed.error).toBeNull();
    expect(Object.keys(parsed.ast.tables).length).toBe(100);
    expect(Object.keys(parsed.ast.tableGroups).length).toBe(10);
    expect(parseTime).toBeLessThan(1500); // Sub-1500ms for 100 tables under parallel test load

    const ast = parsed.ast as DatabaseAST;

    // 2. Compact Layout on 100 tables
    const startCompact = performance.now();
    const compactResult = await layoutDiagram(parsed.nodes, parsed.edges, {
      groupByDomain: false,
    });
    const compactTime = performance.now() - startCompact;

    expect(compactResult.nodes.length).toBe(100);
    expect(compactTime).toBeLessThan(1200); // Under 1.2s for 100 nodes with ELK

    const compactOverlaps = detectOverlaps(compactResult.nodes);
    expect(compactOverlaps).toEqual([]);

    // 3. Grouped Pod Layout on 100 tables across 10 pods
    const startPod = performance.now();
    const podResult = await layoutDiagram(parsed.nodes, parsed.edges, {
      groupByDomain: true,
      tableGroups: ast.tableGroups,
    });
    const podTime = performance.now() - startPod;

    expect(podResult.nodes.length).toBe(100);
    expect(podTime).toBeLessThan(1500);

    const podOverlaps = detectOverlaps(podResult.nodes);
    expect(podOverlaps).toEqual([]);

    // 4. PostgreSQL DDL on 100 tables
    const startDdl = performance.now();
    const ddl = exportDDL(ast);
    const ddlTime = performance.now() - startDdl;

    expect(ddlTime).toBeLessThan(100);
    expect(ddl).toContain('CREATE TABLE "auth_entity_1" (');
    expect(ddl).toContain('CREATE TABLE "support_entity_10" (');
    expect(ddl).toContain('ALTER TABLE "orders_entity_1" ADD CONSTRAINT');

    // 5. Diff on 100-table schema
    const mutated: DatabaseAST = JSON.parse(JSON.stringify(ast));
    mutated.tables['auth_entity_1'].fields.push({
      id: 'auth_entity_1.two_factor_secret',
      name: 'two_factor_secret',
      type: 'text',
      constraints: { isNullable: true },
    });
    delete mutated.tables['support_entity_10'];

    const startDiff = performance.now();
    const diff = diffSchema(ast, mutated);
    const diffTime = performance.now() - startDiff;

    expect(diffTime).toBeLessThan(50);
    expect(diff.upSql.join('\n')).toContain('ALTER TABLE "auth_entity_1" ADD COLUMN "two_factor_secret" text;');
    expect(diff.upSql.join('\n')).toContain('DROP TABLE IF EXISTS "support_entity_10" CASCADE;');
  });
});
