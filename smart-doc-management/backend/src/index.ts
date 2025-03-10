import express from "express";
import { graphqlHTTP } from "express-graphql";
import mongoose from "mongoose";
import { schema } from "./graphql/schema";
import cors from "cors";
import dotenv from "dotenv";
import { uploadRouter } from "./routes/uploadRouter";
import { searchRouter } from "./routes/searchRouter";
import { fileRouter } from "./routes/fileRouter";
import { Document } from "./models/document";

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Configure CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Vite's default port
    credentials: true,
  })
);

// Parse JSON body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define port and MongoDB URI
const PORT = process.env.PORT || 4000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/smart-doc-management";

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    try {
      await Document.syncIndexes();
      console.log("Document indexes synced successfully");
    } catch (indexError) {
      console.error("Index sync error:", indexError);
    }
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Set up routes
app.use("/upload", uploadRouter);
app.use("/file", fileRouter); // Add file router here
app.use("/search", searchRouter);

// Set up GraphQL endpoint
app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    graphiql: true, // Enable GraphiQL for testing in development
  })
);

// Add a health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
