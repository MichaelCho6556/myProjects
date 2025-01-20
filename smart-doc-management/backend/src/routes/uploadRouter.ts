import express, { Request, Response } from "express";
import multer from "multer";
import { S3 } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import { Document } from "../models/document";
import pdf from "pdf-parse";
import Tesseract from "tesseract.js";
import textract from "textract";

const uploadRouter = express.Router();
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

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
      const fileExtension = originalname.split(".").pop();
      const s3Key = `${uuidv4()}.${fileExtension}`;

      let extractedText = "";

      if (fileExtension?.toLowerCase() === "pdf") {
        const pdfData = await pdf(buffer);
        extractedText = pdfData.text;
      } else if (
        fileExtension?.toLowerCase() === "png" ||
        fileExtension?.toLowerCase() === "jpg" ||
        fileExtension?.toLowerCase() === "jpeg"
      ) {
        const ocrResult = await Tesseract.recognize(buffer, "eng");
        extractedText = ocrResult.data.text;
      } else if (
        fileExtension?.toLowerCase() === "docx" ||
        fileExtension?.toLowerCase() === "doc"
      ) {
        extractedText = (await new Promise((resolve, reject) => {
          textract.fromBufferWithName(originalname, buffer, (error, text) => {
            if (error) reject(error);
            else resolve(text);
          });
        })) as string;
      }

      const s3Params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME || "",
        Key: s3Key,
        Body: buffer,
        ContentType: mimetype,
      };
      await s3.upload(s3Params).promise();

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
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
);

export { uploadRouter };
