import type { SampleName } from '@/components/workspace/Toolbar';

export const SAMPLE_SCHEMAS: Record<SampleName, string> = {
  ecommerce: `// JayVis.dev — E-commerce sample schema
Table users {
  id integer [pk, increment]
  email varchar [unique, not null]
  full_name varchar
  password_hash varchar [not null]
  created_at timestamptz [default: 'now()']
  updated_at timestamptz
}

Table products {
  id integer [pk, increment]
  sku varchar [unique, not null]
  name varchar [not null]
  description text
  price decimal [not null]
  stock integer [default: 0]
  is_active boolean [default: true]
  created_at timestamptz [default: 'now()']
}

Table orders {
  id integer [pk, increment]
  user_id integer [not null]
  status varchar [default: 'pending']
  total decimal [default: 0]
  placed_at timestamptz [default: 'now()']
}

Table order_items {
  id integer [pk, increment]
  order_id integer [not null]
  product_id integer [not null]
  quantity integer [not null]
  unit_price decimal [not null]
}

Ref: orders.user_id > users.id [delete: cascade]
Ref: order_items.order_id > orders.id [delete: cascade]
Ref: order_items.product_id > products.id
`,

  blog: `// JayVis.dev — Blog / CMS sample schema
Table authors {
  id integer [pk, increment]
  username varchar [unique, not null]
  email varchar [unique, not null]
  bio text
  avatar_url varchar
  joined_at timestamptz [default: 'now()']
}

Table posts {
  id integer [pk, increment]
  author_id integer [not null]
  title varchar [not null]
  slug varchar [unique, not null]
  body text
  status varchar [default: 'draft']
  published_at timestamptz
}

Table tags {
  id integer [pk, increment]
  name varchar [unique, not null]
}

Table post_tags {
  post_id integer
  tag_id integer
  indexes {
    (post_id, tag_id) [unique]
  }
}

Table comments {
  id integer [pk, increment]
  post_id integer [not null]
  author_name varchar [not null]
  author_email varchar
  body text [not null]
  created_at timestamptz [default: 'now()']
}

Ref: posts.author_id > authors.id [delete: cascade]
Ref: post_tags.post_id > posts.id [delete: cascade]
Ref: post_tags.tag_id > tags.id [delete: cascade]
Ref: comments.post_id > posts.id [delete: cascade]
`,

  saas: `// JayVis.dev — SaaS multi-tenant sample schema
Table organizations {
  id uuid [pk]
  name varchar [not null]
  plan varchar [default: 'free']
  created_at timestamptz [default: 'now()']
}

Table members {
  id uuid [pk]
  org_id uuid [not null]
  user_email varchar [not null]
  role varchar [default: 'member']
  invited_at timestamptz [default: 'now()']

  indexes {
    org_id
  }
}

Table api_keys {
  id uuid [pk]
  org_id uuid [not null]
  label varchar
  key_hash varchar [unique, not null]
  last_used_at timestamptz
  created_at timestamptz [default: 'now()']

  indexes {
    org_id
  }
}

Table projects {
  id uuid [pk]
  org_id uuid [not null]
  name varchar [not null]
  description text
  status varchar [default: 'active']

  indexes {
    org_id
  }
}

Table audit_log {
  id bigint [pk, increment]
  org_id uuid [not null]
  actor_email varchar
  action varchar [not null]
  meta jsonb
  created_at timestamptz [default: 'now()']

  indexes {
    org_id
  }
}

Ref: members.org_id > organizations.id [delete: cascade]
Ref: api_keys.org_id > organizations.id [delete: cascade]
Ref: projects.org_id > organizations.id [delete: cascade]
Ref: audit_log.org_id > organizations.id [delete: cascade]
`,

  auth: `// JayVis.dev — Authentication & sessions sample schema
Table users {
  id uuid [pk]
  email varchar [unique, not null]
  password_hash varchar [not null]
  full_name varchar
  avatar_url varchar
  email_verified_at timestamptz
  is_active boolean [default: true]
  created_at timestamptz [default: 'now()']
  updated_at timestamptz
}

Table sessions {
  id uuid [pk]
  user_id uuid [not null]
  token_hash varchar [unique, not null]
  ip_address varchar
  user_agent text
  expires_at timestamptz [not null]
  created_at timestamptz [default: 'now()']
}

Table oauth_accounts {
  id uuid [pk]
  user_id uuid [not null]
  provider varchar [not null]
  provider_user_id varchar [not null]
  access_token varchar
  refresh_token varchar
  expires_at timestamptz
  created_at timestamptz [default: 'now()']
  indexes {
    (provider, provider_user_id) [unique]
  }
}

Table password_resets {
  id uuid [pk]
  user_id uuid [not null]
  token_hash varchar [unique, not null]
  used_at timestamptz
  expires_at timestamptz [not null]
  created_at timestamptz [default: 'now()']
}

Table roles {
  id integer [pk, increment]
  name varchar [unique, not null]
}

Table user_roles {
  user_id uuid
  role_id integer
  indexes {
    (user_id, role_id) [unique]
  }
}

Ref: sessions.user_id > users.id [delete: cascade]
Ref: oauth_accounts.user_id > users.id [delete: cascade]
Ref: password_resets.user_id > users.id [delete: cascade]
Ref: user_roles.user_id > users.id [delete: cascade]
Ref: user_roles.role_id > roles.id [delete: cascade]
`,

  analytics: `// JayVis.dev — Analytics & events sample schema
Table events {
  id bigint [pk, increment]
  event_name varchar [not null]
  user_id uuid
  session_id varchar
  properties jsonb [default: '{}']
  occurred_at timestamptz [not null, default: 'now()']
}

Table event_properties {
  id bigint [pk, increment]
  event_id bigint [not null]
  key varchar [not null]
  value text
  indexes {
    (event_id, key) [unique]
  }
}

Table funnels {
  id integer [pk, increment]
  name varchar [not null]
  steps jsonb [not null]
  created_at timestamptz [default: 'now()']
}

Table cohorts {
  id integer [pk, increment]
  name varchar [unique, not null]
  description text
  user_ids jsonb [default: '[]']
  created_at timestamptz [default: 'now()']
}

Table dashboards {
  id integer [pk, increment]
  name varchar [not null]
  layout jsonb
  created_by uuid
  created_at timestamptz [default: 'now()']
}

Table dashboard_widgets {
  id integer [pk, increment]
  dashboard_id integer [not null]
  type varchar [not null]
  title varchar
  config jsonb
  position jsonb
}

Ref: event_properties.event_id > events.id [delete: cascade]
Ref: dashboard_widgets.dashboard_id > dashboards.id [delete: cascade]
`,
};
