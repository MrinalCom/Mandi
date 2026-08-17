-- Backing table for @socket.io/postgres-adapter: lets multiple serverless
-- function instances share Socket.IO room membership and broadcasts via
-- Postgres LISTEN/NOTIFY, since (unlike a single long-lived process) there's
-- no shared in-memory state across instances on Vercel.
CREATE TABLE IF NOT EXISTS socket_io_attachments (
    id         bigint GENERATED ALWAYS AS IDENTITY,
    created_at timestamptz DEFAULT NOW(),
    payload    bytea
);
