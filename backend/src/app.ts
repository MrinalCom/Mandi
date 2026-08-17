import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/postgres-adapter";
import { pool } from "./config/db.js";
import { authRouter } from "./routes/auth.routes.js";
import { listingsRouter } from "./routes/listings.routes.js";
import { mandiPricesRouter } from "./routes/mandiPrices.routes.js";
import { poolsRouter } from "./routes/pools.routes.js";
import { ordersRouter } from "./routes/orders.routes.js";
import { farmerRouter } from "./routes/farmer.routes.js";
import { farmersRouter } from "./routes/farmers.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { wishlistRouter } from "./routes/wishlist.routes.js";
import { assistantRouter } from "./routes/assistant.routes.js";
import { registerOrderSocket } from "./sockets/orderSocket.js";

export const app = express();
export const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// On a serverless platform (Vercel) a client's WebSocket connection and a
// later HTTP request that needs to broadcast to it (e.g. a status update)
// can land on two different function instances. Socket.IO's default
// in-memory adapter only tracks room membership within one process, so
// cross-instance broadcasts would silently go nowhere. The Postgres adapter
// moves that room/pub-sub state into Postgres (LISTEN/NOTIFY) instead,
// which every instance shares -- required for this to work correctly
// outside a single long-lived process. No Redis dependency: this project
// already has Postgres, so that's the shared store. Skipped when there's
// no DATABASE_URL (shouldn't happen outside a broken local setup, where
// the in-memory default would still apply for a single dev process).
if (process.env.DATABASE_URL) {
  io.adapter(createAdapter(pool));
}

app.set("io", io);
registerOrderSocket(io);

app.use(cors());
// Raised from Express's 100kb default so a client-resized listing photo
// (sent as a data: URI) fits in the request body.
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/mandi-prices", mandiPricesRouter);
app.use("/api/pools", poolsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/farmer", farmerRouter);
app.use("/api/farmers", farmersRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/assistant", assistantRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
