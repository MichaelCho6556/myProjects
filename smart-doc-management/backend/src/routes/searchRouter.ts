import express, { Request, Response } from "express";
import { Document } from "../models/document";

const searchRouter = express.Router();

searchRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    if (!query) {
      res.status(400).json({ error: "Missing query parameter ?q=" });
      return;
    }

    const results = await Document.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .exec();

    if (results.length === 0) {
      // Return empty array message
      res.json({ message: "No documents found", results: [] });
      return;
    }

    // Return results
    res.json({ message: `Found ${results.length} documents`, results });
    return; // optional, but consistent
  } catch (error) {
    console.error("Search error:", error);
    // Return error message
    res.status(500).json({
      error: "Search failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
    return;
  }
});

export { searchRouter };
