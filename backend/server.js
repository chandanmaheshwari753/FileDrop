const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const cron = require("node-cron");

const cors = require("cors");

const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
const BUCKET = process.env.BUCKET_NAME;

// ✅ Multer config with file type + size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, PDF, and DOCX files are allowed"));
    }
    cb(null, true);
  },
});

// 📌 Analyze File with AI
app.post("/analyze-file", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file provided for analysis." });
    }

    // Convert the file buffer to a part that Gemini can understand
    const imagePart = {
      inlineData: {
        data: file.buffer.toString("base64"),
        mimeType: file.mimetype,
      },
    };

    const prompt = `You are an expert file organization assistant. Analyze the following file content and its original name.
    Original Filename: "${file.originalname}"
    Based on the file content, generate a concise, descriptive filename (without the extension), a list of relevant categories, and a list of specific tags.
    The descriptive filename should be in snake_case or PascalCase.
    Return ONLY a raw JSON object with the following schema: { "descriptiveFilename": "string", "categories": ["string"], "tags": ["string"] }.`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    let text = response.text();

    // Clean the response to ensure it's valid JSON
    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Parse the JSON string from the AI response
    const analysisData = JSON.parse(text);

    // Add the original file extension to the response
    analysisData.extension = file.originalname.split(".").pop();

    res.json(analysisData);
  } catch (err) {
    console.error("AI Analysis Error:", err);
    res.status(500).json({ error: "Failed to analyze the file." });
  }
});

// 📌 Upload file - MODIFIED to save metadata to DB
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // Use the descriptive filename from the request body
    const descriptiveFilename =
      req.body.descriptiveFilename || `${Date.now()}_${file.originalname}`;
    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];
    const categories = req.body.categories
      ? JSON.parse(req.body.categories)
      : [];

    // 1. Upload file to Storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .upload(descriptiveFilename, file.buffer, {
        contentType: file.mimetype,
      });

    if (storageError) throw storageError;

    // 2. Insert metadata into the database
    const { error: dbError } = await supabase.from("files").insert({
      name: descriptiveFilename,
      size: file.size,
      tags: tags,
      categories: categories,
    });

    if (dbError) throw dbError;

    res.json({
      message: "File uploaded successfully",
      filePath: descriptiveFilename,
    });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(400).json({ error: err.message });
  }
});

// 📌 List files - MODIFIED to fetch from DB
app.get("/files", async (req, res) => {
  try {
    // 1. Fetch metadata from the 'files' table
    const { data: filesData, error } = await supabase
      .from("files")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 2. Construct the public URL for each file
    const filesWithLinks = filesData.map((file) => ({
      ...file, // This includes name, size, tags, categories, created_at
      url: `${process.env.SUPABASE_URL.replace(
        ".supabase.co",
        ".supabase.co/storage/v1/object/public"
      )}/${BUCKET}/${file.name}`,
    }));

    res.json(filesWithLinks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 Delete file - MODIFIED to delete from DB
app.delete("/files/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    // 1. Delete from Storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([filename]);
    if (storageError) throw storageError;

    // 2. Delete from Database
    const { error: dbError } = await supabase
      .from("files")
      .delete()
      .eq("name", filename);
    if (dbError) throw dbError;

    res.json({ message: "File deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 Rename file - MODIFIED to update DB
app.put("/files/:filename", async (req, res) => {
  try {
    const oldName = req.params.filename;
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ error: "New name required" });

    // 1. Rename in Storage (Copy + Delete)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(oldName);
    if (downloadError) throw downloadError;
    await supabase.storage
      .from(BUCKET)
      .upload(newName, fileData, { upsert: true });
    await supabase.storage.from(BUCKET).remove([oldName]);

    // 2. Update name in Database
    const { error: dbError } = await supabase
      .from("files")
      .update({ name: newName })
      .eq("name", oldName);
    if (dbError) throw dbError;

    res.json({ message: "File renamed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 Auto-delete files older than 1 day
cron.schedule("0 * * * *", async () => {
  console.log("Running auto-delete job...");
  const { data, error } = await supabase.storage.from(BUCKET).list("");
  if (error) return console.error(error);

  const now = Date.now();
  for (const file of data) {
    const uploadedTime = new Date(file.created_at).getTime();
    if (now - uploadedTime > 24 * 60 * 60 * 1000) {
      await supabase.storage.from(BUCKET).remove([file.name]);
      console.log(`Deleted file: ${file.name}`);
    }
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
