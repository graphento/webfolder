import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import yaml from "js-yaml";
import apiRouter from "./routes/api.js";
import { initFileService } from "./services/fileService.js";

const app = express();

// config
const config = yaml.load(
  fs.readFileSync("./backend/config/config.yaml", "utf-8")
);

const PORT = config.port;
const STORAGE = path.resolve(config.storage_path);

// init file service
initFileService(STORAGE);

// middleware
app.use(express.json());

// API
app.use("/api", apiRouter);

// frontend
app.use("/", express.static("frontend"));

// ensure storage exists
if (!fs.existsSync(STORAGE)) {
  fs.mkdirSync(STORAGE, { recursive: true });
}

// start
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});