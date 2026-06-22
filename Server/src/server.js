import app from "./app.js";
import { connectDB } from "./config/db.js";
import { attachRealtime } from "./services/realtimeService.js";

const port = process.env.PORT || 5000;

connectDB()
  .then(() => {
    const server = app.listen(port, () => console.log(`NeighborhoodShare API running on http://localhost:${port}`));
    attachRealtime(server);
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
