import mongoose, { Schema } from "mongoose";

const documentSchema = new Schema({
  filename: { type: String, required: true },
  s3Key: { type: String, required: true, unique: true },
  uploadDate: { type: Date, default: Date.now },
  extractedText: { type: String, default: "" },
});

// Remove any existing problematic indexes first
documentSchema.index({ filename: "text", extractedText: "text" });

export const Document = mongoose.model("Document", documentSchema);
