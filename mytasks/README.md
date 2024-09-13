# TODO List Application

## Overview

A modern TODO list application built with React, Next.js, and MongoD, providing users with secure authentication, task management, and a responsive design. The app enables users to create, edit, and delete tasks, manage task categories, and collaborate by sharing tasks.

## Features

### Frameworks and Technologies

- **Frontend**: React, Next.js
- **Backend**: MongoDB, prisma ORM
- **Authentication**: Clerk for secure user login (supports Github and Google)
- **Loading Indicators**: Toploader for smooth loading experience

### Task Management

- **Create, Edit, Delete Tasks**: Full CRUD operations for managing To-Do list items.
- **Task Expiration**: Tasks expire after a set period, helping users stay organized.
- **Task Filters**: Filter tasks by categories like Completed, Important, and Incomplete.
- **Task Sharing**: Share tasks with other users for easy collaboration.

### Responsive Design

- Optimized for both large and small screens.
- Sidebar toggling for mobile devices, enhancing user experience.

### Database Structure

- **Users**: Stories user data including names, emails, and profile pictures.
- **Tasks**: Contains task data, including description, category, expiration time, and user associations.

### Creative Features

- **User Authentication**: Clerk integration allows login via Github or Google, with personalized profile management.
- **Customizable UI**: User-specific display of names and profile pictures, enhancing the tailored experience.
- **Responsive Sidebar**: Toggle sidebar visibility on smaller screens for better navigation.
- **Visual Loading Experience**: A green circle loader and top loading bar indicate page loading status.
- **Task Categorization**: Tasks are grouped into categories for better task management and prioritization.

## Installation and Setup

To run the project locally:

1. **Clone the repository**:
   '''bash
   git clone https://github.com/yourusername/todo-app.git
   cd todo-app
   '''
2. **Install dependencies**:
   '''bash
   npm install
   '''
3. **Set up environment variables**:
   Create a '.env' file in the root directory with the following:
   '''bash
   NEXT_PUBLIC_CLERK_FRONTEND_API=your_clerk_api
   MONGODB-URI-your_mongo_db_connection_string
   '''
4. **Run the application**:
   ''bash
   npm run dev
   '''
   The app will be running at 'http://localhost:3000'.

## Project Structure

- **/app**: Application pages, components, and API routes.
- **/components**: Reusable UI elements (buttons, modals, sidebar).
- **/context**: Global state management for authentication and themes.
- **/utils**: Utility functions (date formatting, API connections).
