import type { SampleName } from '@/components/workspace/Toolbar';

export const SAMPLE_SCHEMAS: Record<SampleName, string> = {
  ecommerce: `// StitchDB — E-commerce sample schema
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

  blog: `// StitchDB — Blog / CMS sample schema
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

  saas: `// StitchDB — SaaS multi-tenant sample schema
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
}

Table api_keys {
  id uuid [pk]
  org_id uuid [not null]
  label varchar
  key_hash varchar [unique, not null]
  last_used_at timestamptz
  created_at timestamptz [default: 'now()']
}

Table projects {
  id uuid [pk]
  org_id uuid [not null]
  name varchar [not null]
  description text
  status varchar [default: 'active']
}

Table audit_log {
  id bigint [pk, increment]
  org_id uuid [not null]
  actor_email varchar
  action varchar [not null]
  meta jsonb
  created_at timestamptz [default: 'now()']
}

Ref: members.org_id > organizations.id [delete: cascade]
Ref: api_keys.org_id > organizations.id [delete: cascade]
Ref: projects.org_id > organizations.id [delete: cascade]
Ref: audit_log.org_id > organizations.id [delete: cascade]
`,
};
