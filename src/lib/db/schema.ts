import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * UNIFIED BLOCK-BASED ARCHITECTURE
 * 
 * This schema replaces the entire fragmented system with a unified content_blocks approach.
 * Everything is a block: redirects, articles, images, cards, galleries, etc.
 * 
 * Key Benefits:
 * - Single source of truth for all content
 * - Unlimited content types without schema changes
 * - Simplified service layer (5+ services → 1 service)
 * - Performance optimized with targeted indexes
 * - Extensible renderer system
 */

// Unified content blocks table - replaces links, pages, images, posts, page_objects, slugs
export const contentBlocks = pgTable('content_blocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  type: varchar('type', { length: 20 }).default('root').notNull(), // 'root' | 'child'
  parent_id: uuid('parent_id'),
  renderer: varchar('renderer', { length: 50 }).notNull(), // 'redirect', 'article', 'image', 'card', etc.
  data: jsonb('data').notNull().default('{}'), // Flexible content data
  metadata: jsonb('metadata').notNull().default('{}'), // SEO, analytics, styling
  display_order: integer('display_order').default(0).notNull(),
  is_published: boolean('is_published').default(true).notNull(),
  is_landing_block: boolean('is_landing_block').default(false).notNull(), // Only one block can be landing
  is_private: boolean('is_private').default(false).notNull(), // Hide from public index
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Performance-optimized indexes
  slugIndex: index('idx_blocks_slug').on(table.slug),
  parentOrderIndex: index('idx_blocks_parent_order').on(table.parent_id, table.display_order),
  rendererIndex: index('idx_blocks_renderer').on(table.renderer),
  publishedIndex: index('idx_blocks_published').on(table.is_published),
  typeIndex: index('idx_blocks_type').on(table.type),
  parentRefIndex: index('idx_blocks_parent_ref').on(table.parent_id),
  landingIndex: index('idx_blocks_landing').on(table.is_landing_block),
  privateIndex: index('idx_blocks_private').on(table.is_private),
}));

// Simplified analytics - unified click tracking
export const clicks = pgTable('clicks', {
  id: uuid('id').defaultRandom().primaryKey(),
  block_id: uuid('block_id').references(() => contentBlocks.id, { onDelete: 'cascade' }).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  referrer: varchar('referrer', { length: 500 }),
  user_agent: text('user_agent'),
  ip_address: varchar('ip_address', { length: 45 }), // IPv6 compatible
  country: varchar('country', { length: 2 }), // ISO country code
  metadata: jsonb('metadata').default('{}'), // Flexible analytics data
}, (table) => ({
  // Analytics-optimized indexes
  blockTimestampIndex: index('idx_clicks_block_timestamp').on(table.block_id, table.timestamp),
  timestampIndex: index('idx_clicks_timestamp').on(table.timestamp),
}));

// Keep existing auth tables unchanged for compatibility
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  is_active: boolean('is_active').default(true).notNull(),
  last_login: timestamp('last_login'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const magicLinks = pgTable('magic_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires_at: timestamp('expires_at').notNull(),
  used_at: timestamp('used_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

/**
 * CONTENT BLOCK TYPE DEFINITIONS
 * 
 * These TypeScript interfaces define the structure for different block types.
 * Each renderer expects specific data and metadata formats.
 */

// Base content block interface
export interface ContentBlock {
  id: string;
  slug: string;
  type: 'root' | 'child';
  parent_id?: string;
  renderer: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  display_order: number;
  is_published: boolean;
  is_landing_block: boolean;
  is_private: boolean;
  created_at: Date;
  updated_at: Date;
}

// Renderer-specific data interfaces
export interface RedirectBlockData {
  url: string;
  statusCode?: number; // 301, 302, etc.
}

export interface ArticleBlockData {
  title: string;
  content: unknown[]; // Block-based content structure
  reading_time?: number;
  excerpt?: string;
}

export interface ImageBlockData {
  url: string;
  alt_text?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface CardBlockData {
  title: string;
  description?: string;
  url?: string;
  image_url?: string;
  icon?: string;
}

export interface GalleryBlockData {
  images: ImageBlockData[];
  layout?: 'grid' | 'masonry' | 'carousel';
}

// Metadata interfaces for SEO and analytics
export interface BlockMetadata {
  title?: string;
  description?: string;
  og_image?: string;
  og_title?: string;
  og_description?: string;
  twitter_card?: string;
  canonical_url?: string;
  robots?: string;
  schema_org?: Record<string, unknown>;
  custom_css?: string;
  custom_js?: string;
  analytics?: Record<string, unknown>;
}

/**
 * MIGRATION MAPPING
 * 
 * This documents how existing tables map to the new unified structure:
 * 
 * links → content_blocks { renderer: 'redirect', data: { url, statusCode }, metadata: { title, description, icon, image_url } }
 * pages → content_blocks { renderer: 'container', data: { theme }, children: [...] }
 * images → content_blocks { renderer: 'image', data: { url, alt_text, caption, width, height }, metadata: { blurhash, file_size, mime_type } }
 * posts → content_blocks { renderer: 'article', data: { title, content, reading_time }, metadata: { excerpt, is_published, published_at } }
 * page_objects → parent-child relationships in content_blocks
 * slugs → slug field in content_blocks (unified namespace)
 * clicks + object_clicks → unified clicks table
 * landing_page_components → content_blocks with appropriate renderers
 */

// Media assets for file management and optimization
export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  original_filename: varchar('original_filename', { length: 255 }),
  mime_type: varchar('mime_type', { length: 100 }),
  size_bytes: integer('size_bytes'),
  width: integer('width'),
  height: integer('height'),
  storage_path: text('storage_path').notNull(),
  thumbnail_path: text('thumbnail_path'),
  blurhash: varchar('blurhash', { length: 100 }),
  uploaded_by: uuid('uploaded_by').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Performance indexes for media queries
  filenameIndex: index('idx_media_filename').on(table.filename),
  uploaderIndex: index('idx_media_uploader').on(table.uploaded_by),
  createdIndex: index('idx_media_created').on(table.created_at),
  mimeTypeIndex: index('idx_media_mime_type').on(table.mime_type),
}));

// Block revisions for version control and history
export const blockRevisions = pgTable('block_revisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  block_id: uuid('block_id').references(() => contentBlocks.id, { onDelete: 'cascade' }).notNull(),
  data: jsonb('data').notNull(),
  metadata: jsonb('metadata'),
  created_by: uuid('created_by').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Revision history indexes
  blockRevisionIndex: index('idx_revisions_block').on(table.block_id),
  createdIndex: index('idx_revisions_created').on(table.created_at),
}));

// URL words for dynamic suggestion generation
export const urlWords = pgTable('url_words', {
  id: uuid('id').defaultRandom().primaryKey(),
  word: varchar('word', { length: 50 }).notNull(),
  word_type: varchar('word_type', { length: 20 }).notNull(), // 'adjective' | 'noun'
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for fast random word selection
  wordTypeIndex: index('idx_url_words_type').on(table.word_type),
  wordIndex: index('idx_url_words_word').on(table.word),
}));

// Tags for content organization and filtering
export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  color: varchar('color', { length: 7 }).default('#6b7280'), // Hex color for UI
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  nameIndex: index('idx_tags_name').on(table.name),
  slugIndex: index('idx_tags_slug').on(table.slug),
}));

// Many-to-many relationship between blocks and tags
export const blockTags = pgTable('block_tags', {
  block_id: uuid('block_id').references(() => contentBlocks.id, { onDelete: 'cascade' }).notNull(),
  tag_id: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  // Composite primary key for many-to-many
  pk: index('pk_block_tags').on(table.block_id, table.tag_id),
  blockIndex: index('idx_block_tags_block').on(table.block_id),
  tagIndex: index('idx_block_tags_tag').on(table.tag_id),
}));

// Enhanced type definitions for new tables
export interface MediaAsset {
  id: string;
  filename: string;
  original_filename?: string;
  mime_type?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  storage_path: string;
  thumbnail_path?: string;
  blurhash?: string;
  uploaded_by?: string;
  created_at: Date;
}

export interface BlockRevision {
  id: string;
  block_id: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_by?: string;
  created_at: Date;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  created_at: Date;
}

export interface BlockTag {
  block_id: string;
  tag_id: string;
}

// URL word interface for suggestion generation
export interface UrlWord {
  id: string;
  word: string;
  word_type: 'adjective' | 'noun';
  created_at: Date;
}