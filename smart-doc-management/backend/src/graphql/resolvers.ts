import { Document } from "../models/document";
import { v4 as uuidv4 } from "uuid";
import { S3 } from "aws-sdk";
import dotenv from "dotenv";
dotenv.config();

const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export const getDocuments = async () => {
  try {
    const documents = await Document.find().lean();
    console.log("Database documents:", documents);

    if (!documents || documents.length === 0) {
      console.log("No documents found");
      return [];
    }

    return documents.map((doc) => ({
      id: doc._id.toString(),
      filename: doc.filename,
      s3Key: doc.s3Key,
      uploadDate: doc.uploadDate.toISOString(),
      extractedText: doc.extractedText,
    }));
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw new Error("Failed to retreive documents");
  }
};

export const addDocument = async (args: any) => {
  const { filename } = args;

  const fileExtension = filename.split(".").pop();
  const s3Key = `${uuidv4()}.${fileExtension}`;

  const s3Params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME || "",
    Key: s3Key,
    Body: "test", // TODO: Replace with actual file content
    ContentType: `text/${fileExtension}`, // Add proper content type
  };

  try {
    await s3.upload(s3Params).promise();

    const newDocument = new Document({
      filename,
      s3Key,
      uploadDate: new Date(),
    });

    return await newDocument.save();
  } catch (e) {
    console.error("Error uploading to S3:", e);
    throw new Error("Failed to upload document");
  }
};
