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
import { registerOrderSocket } from "./sockets/orderSocket.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

app.set("io", io);
registerOrderSocket(io);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/mandi-prices", mandiPricesRouter);
app.use("/api/pools", poolsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/farmer", farmerRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT) || 4000;
httpServer.listen(PORT, () => {
  console.log(`Mandi backend listening on :${PORT}`);
});
