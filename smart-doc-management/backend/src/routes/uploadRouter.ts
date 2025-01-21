import express, { Request, Response } from "express";
import multer from "multer";
import { S3 } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import { Document } from "../models/document";
import pdf from "pdf-parse";
import Tesseract from "tesseract.js";
import mammoth from "mammoth";

const uploadRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

uploadRouter.post(
  "/",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file received" });
        return;
      }

      const { originalname, buffer, mimetype } = req.file;
      const fileExtension = originalname.split(".").pop()?.toLowerCase() || "";
      const s3Key = `${uuidv4()}.${fileExtension}`;

      let extractedText = "";

      // Text extraction logic
      try {
        if (fileExtension === "pdf") {
          const pdfData = await pdf(buffer);
          extractedText = pdfData.text;
        } else if (["png", "jpg", "jpeg"].includes(fileExtension)) {
          const {
            data: { text },
          } = await Tesseract.recognize(buffer, "eng");
          extractedText = text;
        } else if (["docx", "doc"].includes(fileExtension)) {
          const { value } = await mammoth.extractRawText({ buffer });
          extractedText = value;
        }
      } catch (error) {
        console.error("Text extraction error:", error);
        extractedText = "Text extraction failed";
      }

      // Upload to S3
      const s3Params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: s3Key,
        Body: buffer,
        ContentType: mimetype,
      };
      await s3.upload(s3Params).promise();

      // Save document with extracted text
      const newDocument = new Document({
        filename: originalname,
        s3Key,
        uploadDate: new Date().toISOString(),
        extractedText,
      });

      const savedDoc = await newDocument.save();

      res.status(200).json({
        message: "File uploaded successfully",
        document: savedDoc,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
);

export { uploadRouter };
