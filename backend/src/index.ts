import { httpServer } from "./app.js";

const PORT = Number(process.env.PORT) || 4000;
httpServer.listen(PORT, () => {
  console.log(`Mandi backend listening on :${PORT}`);
});
