import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import {
  readDir,
  readFile,
  createDir,
  deletePath,
  movePath,
  copyPath
} from "../services/fileService.js";

const STORAGE = "./storage";
const router = express.Router();

// GET /api/read_dir?path=/
router.get("/read_dir", async (req, res) => {
  const result = await readDir(req.query.path || "/");
  res.json(result);
});

// GET /api/read_file?path=/file.txt
router.get("/read_file", async (req, res) => {
  const result = await readFile(req.query.path);
  res.json(result);
});

// POST /api/create_dir
router.post("/create_dir", async (req, res) => {
  const result = await createDir(req.body.path);
  res.json(result);
});

// POST /api/delete
router.post("/delete", async (req, res) => {
  const result = await deletePath(req.body.path);
  res.json(result);
});

// POST /api/move
router.post("/move", async (req, res) => {
  const { src, dst } = req.body;
  const result = await movePath(src, dst);
  res.json(result);
});

// POST /api/copy
router.post("/copy", async (req, res) => {
  const { src, dst } = req.body;
  const result = await copyPath(src, dst);
  res.json(result);
});

const upload = multer({ dest: "temp/" });
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const targetPath = req.body.path || "/";

    const dest = path.join(process.env.STORAGE || "storage", targetPath, file.originalname);

    await fs.rename(file.path, dest);

    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.get("/download", async (req, res) => {
  try {
    const filePath = req.query.path;

    const fullPath = path.join(process.env.STORAGE || "storage", filePath);

    res.download(fullPath);
  } catch (e) {
    res.status(500).send(e.message);
  }
});
export default router;