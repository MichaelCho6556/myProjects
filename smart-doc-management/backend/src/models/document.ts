import mongoose, { Schema } from "mongoose";

const documentSchema = new Schema({
  filename: { type: String, required: true },
  s3Key: { type: String, required: true, unique: true },
  uploadDate: { type: Date, default: Date.now },
  extractedText: { type: String, default: "" },
});

// Create text indexes for search functionality
documentSchema.index(
  {
    filename: "text",
    extractedText: "text",
  },
  {
    weights: {
      filename: 10,
      extractedText: 5,
    },
    name: "text_search_index",
  }
);

export const Document = mongoose.model("Document", documentSchema);
