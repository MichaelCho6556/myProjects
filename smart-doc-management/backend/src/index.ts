import express from "express";
import { graphqlHTTP } from "express-graphql";
import mongoose from "mongoose";
import { schema } from "./graphql/schema";
import cors from "cors";
import dotenv from "dotenv";
import { uploadRouter } from "./routes/uploadRouter";
import { searchRouter } from "./routes/searchRouter";
import { Document } from "./models/document";

dotenv.config();

const app = express();

// Configure CORS
app.use(
  cors({
    origin: "http://localhost:5173", // Vite's default port
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    try {
      await Document.syncIndexes();
      console.log("Indexes synced");
    } catch (indexError) {
      console.error("Index sync error:", indexError);
    }
  })
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/upload", uploadRouter);

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    graphiql: true,
  })
);

app.use("/search", searchRouter);

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
