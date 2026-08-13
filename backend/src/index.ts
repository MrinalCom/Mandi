import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

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

const PORT = Number(process.env.PORT) || 4000;
httpServer.listen(PORT, () => {
  console.log(`Mandi backend listening on :${PORT}`);
});
