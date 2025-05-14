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
    const documents = await Document.find().lean().sort({ uploadDate: -1 });
    console.log(`Retrieved ${documents.length} documents from database`);

    if (!documents || documents.length === 0) {
      console.log("No documents found in database");
      return [];
    }

    // Transform MongoDB documents to GraphQL format
    const transformedDocs = documents.map((doc) => ({
      id: doc._id.toString(),
      filename: doc.filename,
      s3Key: doc.s3Key,
      uploadDate: doc.uploadDate
        ? typeof doc.uploadDate === "string"
          ? doc.uploadDate
          : doc.uploadDate.toISOString()
        : new Date().toISOString(),
      extractedText: doc.extractedText || "",
    }));

    console.log(`Transformed ${transformedDocs.length} documents`);
    return transformedDocs;
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw new Error("Failed to retrieve documents");
  }
};

export const getDocumentById = async (args: { id: string }) => {
  try {
    const { id } = args;
    const document = await Document.findById(id).lean();

    if (!document) {
      throw new Error(`Document with ID ${id} not found`);
    }

    return {
      id: document._id.toString(),
      filename: document.filename,
      s3Key: document.s3Key,
      uploadDate: document.uploadDate
        ? typeof document.uploadDate === "string"
          ? document.uploadDate
          : document.uploadDate.toISOString()
        : new Date().toISOString(),
      extractedText: document.extractedText || "",
    };
  } catch (error) {
    console.error(`Error fetching document ${args.id}:`, error);
    throw new Error("Failed to retrieve document");
  }
};

export const addDocument = async (args: any) => {
  const { filename } = args;

  const fileExtension = filename.split(".").pop();
  const s3Key = `${uuidv4()}.${fileExtension}`;

  const s3Params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME || "",
    Key: s3Key,
    Body: "test", // This should be unused as we use uploadRouter for actual uploads
    ContentType: `application/${fileExtension}`,
  };

  try {
    // Note: This is only for GraphQL API testing
    // Real uploads should go through the uploadRouter
    await s3.upload(s3Params).promise();

    const newDocument = new Document({
      filename,
      s3Key,
      uploadDate: new Date(),
      extractedText: "Sample text for GraphQL testing",
    });

    const savedDoc = await newDocument.save();

    return {
      id: savedDoc._id.toString(),
      filename: savedDoc.filename,
      s3Key: savedDoc.s3Key,
      uploadDate: savedDoc.uploadDate.toISOString(),
      extractedText: savedDoc.extractedText || "",
    };
  } catch (e) {
    console.error("Error in addDocument resolver:", e);
    throw new Error("Failed to create document");
  }
};

export const searchDocuments = async (args: { query: string }) => {
  try {
    const { query } = args;

    if (!query || query.trim() === "") {
      return await getDocuments();
    }

    const documents = await Document.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .lean();

    return documents.map((doc) => ({
      id: doc._id.toString(),
      filename: doc.filename,
      s3Key: doc.s3Key,
      uploadDate:
        typeof doc.uploadDate === "string"
          ? doc.uploadDate
          : doc.uploadDate.toISOString(),
      extractedText: doc.extractedText || "",
    }));
  } catch (error) {
    console.error("Error searching documents:", error);
    throw new Error("Failed to search documents");
  }
};
