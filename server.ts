import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initialDBState } from "./src/initialData.js";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

app.use(express.json({ limit: "50mb" }));

// Initialize DB file if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(initialDBState, null, 2), "utf-8");
}

// REST API for DB state sync
app.get("/api/db", (req, res) => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      res.json(JSON.parse(data));
    } else {
      res.json(initialDBState);
    }
  } catch (error) {
    console.error("Error reading db.json:", error);
    res.status(500).json({ error: "Failed to read database state" });
  }
});

app.post("/api/db", (req, res) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (error) {
    console.error("Error writing db.json:", error);
    res.status(500).json({ error: "Failed to save database state" });
  }
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AMROW LMS Server running on http://localhost:${PORT}`);
  });
}

start();
