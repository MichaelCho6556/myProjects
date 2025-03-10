import express, { Request, Response } from "express";
import { S3 } from "aws-sdk";
import { Document } from "../models/document";

const fileRouter = express.Router();

// Configure S3
const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Get a signed URL for accessing a file
fileRouter.get("/:key", async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: "File key is required" });
    }

    // Verify the document exists in our database
    const document = await Document.findOne({ s3Key: key });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Generate a signed URL that expires in 15 minutes
    const url = s3.getSignedUrl("getObject", {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      Expires: 900, // 15 minutes in seconds
    });

    // For browser-friendly content, redirect to the URL
    // For API usage, return the URL as JSON
    const accept = req.headers.accept || "";
    if (accept.includes("application/json")) {
      res.json({ url });
    } else {
      res.redirect(url);
    }
  } catch (error: any) {
    console.error("Error accessing file:", error);
    res.status(500).json({
      error: "Failed to access file",
      details: error.message,
    });
  }
});

// Download file directly
fileRouter.get("/:key/download", async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: "File key is required" });
    }

    // Verify the document exists in our database
    const document = await Document.findOne({ s3Key: key });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Get the file from S3
    const s3Object = await s3
      .getObject({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
      })
      .promise();

    // Set appropriate headers
    res.setHeader(
      "Content-Type",
      s3Object.ContentType || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${document.filename}"`
    );

    // Send the file
    res.send(s3Object.Body);
  } catch (error: any) {
    console.error("Error downloading file:", error);
    res.status(500).json({
      error: "Failed to download file",
      details: error.message,
    });
  }
});

export { fileRouter };
