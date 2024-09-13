import prisma from "@/app/utils/connect";
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

// Handles POST request for creating a new task
export async function POST(req: Request) {
  try {
    const { userId } = auth(); // Extract user ID from the authentication context

    // Check if the user is authenticated
    if (!userId) {
      // If not, return an unauthorized error response
      return NextResponse.json({ error: "Unauthorized", status: 401 });
    }

    // Parse the request body and extract task details
    const { title, description, date, completed, important } = await req.json();

    // Validate required fields
    if (!title || !description || !date) {
      return NextResponse.json({
        error: "Missing required fields",
        status: 400,
      });
    }

    // Additional validation for the title length
    if (title.length < 3) {
      return NextResponse.json({
        error: "Title must be at least 3 characters long",
        status: 400,
      });
    }

    // Create a new task in the database
    const task = await prisma.task.create({
      data: {
        title,
        description,
        date,
        isCompleted: completed,
        isImportant: important,
        userId, // Associate the task with the logged-in user
      },
    });

    // Return the created task as a response
    return NextResponse.json(task);
  } catch (error) {
    // Log and return error if task creation fails
    console.log("ERROR CREATING TASK: ", error);
    return NextResponse.json({ error: "Error creating task", status: 500 });
  }
}

// Handles GET request for fetching all tasks associated with the logged-in user
export async function GET(req: Request) {
  try {
    const { userId } = auth(); // Authenticate and get the user ID

    // Check if the user is authenticated
    if (!userId) {
      // Return an unauthorized error response if not authenticated
      return NextResponse.json({ error: "Unauthorized", status: 401 });
    }

    // Retrieve all tasks for the authenticated user from the database
    const tasks = await prisma.task.findMany({
      where: {
        userId, // Filter tasks by user ID
      },
    });

    // Return the list of tasks
    return NextResponse.json(tasks);
  } catch (error) {
    // Log and return error if fetching tasks fails
    console.log("ERROR GETTING TASKS: ", error);
    return NextResponse.json({ error: "Error updating task", status: 500 });
  }
}

// Handles PUT request for updating a specific task's completion status
export async function PUT(req: Request) {
  try {
    const { userId } = auth(); // Authenticate and get the user ID
    const { isCompleted, id } = await req.json(); // Get the task ID and new completion status from the request

    // Check if the user is authenticated
    if (!userId) {
      // Return an unauthorized error response if not authenticated
      return NextResponse.json({ error: "Unauthorized", status: 401 });
    }

    // Update the specified task in the database
    const task = await prisma.task.update({
      where: {
        id, // Specify which task to update
      },
      data: {
        isCompleted, // Set the new completion status
      },
    });

    // Return the updated task
    return NextResponse.json(task);
  } catch (error) {
    // Log and return error if task update fails
    console.log("ERROR UPDATING TASK: ", error);
    return NextResponse.json({ error: "Error deleting task", status: 500 });
  }
}
