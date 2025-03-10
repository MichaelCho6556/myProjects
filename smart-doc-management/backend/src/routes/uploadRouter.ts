import express, { Request, Response } from "express";
import multer from "multer";
import { S3 } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import { Document } from "../models/document";
import pdf from "pdf-parse";
import Tesseract from "tesseract.js";
import mammoth from "mammoth";

const uploadRouter = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Configure S3
const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Validate environment variables on startup
if (!process.env.AWS_S3_BUCKET_NAME) {
  console.error("AWS_S3_BUCKET_NAME environment variable not set!");
}

uploadRouter.post(
  "/",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file received" });
      }

      const { originalname, buffer, mimetype } = req.file;
      const fileExtension = originalname.split(".").pop()?.toLowerCase() || "";

      // Generate a unique S3 key with uuid to prevent overwriting
      const s3Key = `${uuidv4()}.${fileExtension}`;

      console.log(`Processing file: ${originalname} (${mimetype})`);

      // Extract text based on file type
      let extractedText = "";
      try {
        console.log(`Starting text extraction for ${fileExtension} file`);

        if (fileExtension === "pdf") {
          console.log("Extracting text from PDF...");
          const pdfData = await pdf(buffer);
          extractedText = pdfData.text || "";
          console.log(`Extracted ${extractedText.length} characters from PDF`);
        } else if (["png", "jpg", "jpeg", "gif"].includes(fileExtension)) {
          console.log("Performing OCR on image...");
          const {
            data: { text },
          } = await Tesseract.recognize(buffer, "eng");
          extractedText = text || "";
          console.log(
            `Extracted ${extractedText.length} characters from image`
          );
        } else if (["docx", "doc"].includes(fileExtension)) {
          console.log("Extracting text from Word document...");
          const { value } = await mammoth.extractRawText({ buffer });
          extractedText = value || "";
          console.log(
            `Extracted ${extractedText.length} characters from Word document`
          );
        } else if (fileExtension === "txt") {
          // For text files, just convert buffer to string
          extractedText = buffer.toString("utf-8");
          console.log(
            `Extracted ${extractedText.length} characters from text file`
          );
        }

        // Trim and clean up extracted text
        extractedText = extractedText.trim();

        if (!extractedText) {
          console.log("No text was extracted from the file");
        }
      } catch (error) {
        console.error("Text extraction error:", error);
        extractedText = "Text extraction failed";
      }

      // Upload to S3
      console.log(`Uploading to S3: ${s3Key}`);
      const s3Params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: s3Key,
        Body: buffer,
        ContentType: mimetype,
      };

      const s3Response = await s3.upload(s3Params).promise();
      console.log(`File uploaded to S3: ${s3Response.Location}`);

      // Save document with extracted text to MongoDB
      const newDocument = new Document({
        filename: originalname,
        s3Key,
        uploadDate: new Date().toISOString(),
        extractedText,
      });

      const savedDoc = await newDocument.save();
      console.log(`Document saved to MongoDB with ID: ${savedDoc.id}`);

      // Return success response
      res.status(200).json({
        message: "File uploaded successfully",
        document: {
          id: savedDoc.id,
          filename: savedDoc.filename,
          uploadDate: savedDoc.uploadDate,
          hasExtractedText: extractedText.length > 0,
        },
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({
        error: "Failed to upload file",
        details: error.message || "Unknown error occurred",
      });
    }
  }
);

// Add new endpoint to get a signed URL for file download/viewing
uploadRouter.get("/:key", async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: "File key is required" });
    }

    // Generate a signed URL that expires in 15 minutes
    const url = s3.getSignedUrl("getObject", {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      Expires: 900, // 15 minutes in seconds
    });

    res.json({ url });
  } catch (error: any) {
    console.error("Error generating signed URL:", error);
    res.status(500).json({
      error: "Failed to generate file URL",
      details: error.message,
    });
  }
});

export { uploadRouter };
