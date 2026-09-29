-- The SQL builder owns application tables. This migration only removes the
-- unused User/Post scaffold from databases created before migrations existed.
DROP TABLE IF EXISTS "Post";
DROP TABLE IF EXISTS "User";
