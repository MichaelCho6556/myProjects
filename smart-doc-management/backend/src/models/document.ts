import mongoose, { Schema } from "mongoose";

const documentSchema = new Schema({
  filename: String,
  s3Key: String,
  uploadDate: String,
  extractedText: { type: String, default: "" },
});

documentSchema.index({
  filename: "text",
  extractedText: "text",
});

export const Document = mongoose.model("Document", documentSchema);
