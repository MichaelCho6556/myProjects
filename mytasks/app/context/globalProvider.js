"use client";
import React, { createContext, useState, useContext, useEffect } from "react";
import themes from "./themes";
import axios from "axios";
import toast from "react-hot-toast";
import { useUser } from "@clerk/nextjs";

export const GlobalContext = createContext();
export const GlobalUpdateContext = createContext();

// GlobalProvider component for managing global state
export const GlobalProvider = ({ children }) => {
  const { user } = useUser(); // Getting user data using Clerk's useUser hook

  // State variables for managing global state
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [editingTask, setEditingTask] = useState(false);
  const [tasks, setTasks] = useState([]);

  // Accessing selected theme from themes object
  const theme = themes[selectedTheme];

  // Function to open modal
  const openModal = () => {
    setModal(true);
  };

  // Function to close modal
  const closeModal = () => {
    setModal(false);
  };

  // Function to toggle menu collapse
  const collapseMenu = () => {
    setCollapsed(!collapsed);
  };

  // Function to fetch all tasks
  const allTasks = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get("/api/tasks");

      const sorted = res.data.sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      setTasks(sorted);

      setIsLoading(false);
    } catch (error) {
      console.log(error);
    }
  };

  // Function to delete a task
  const deleteTask = async (id) => {
    try {
      const res = await axios.delete(`/api/tasks/${id}`);
      toast.success("Task deleted");

      allTasks();
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    }
  };

  // Function to update a task
  const updateTask = async (task) => {
    try {
      const res = await axios.put(`/api/tasks`, task);

      toast.success("Task updated");

      allTasks();
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    }
  };

  // Function to fetch a task for editing
  const editTask = async (task) => {
    try {
      const res = await axios.get(`/api/tasks/${id}`);
      updateTaskData(res.data);
      toast.success("Task ready to be edited");
      allTasks();
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    }
  };

  // Filtering tasks based on completion and importance
  const completedTasks = tasks.filter((task) => task.isCompleted === true);
  const importantTasks = tasks.filter((task) => task.isImportant === true);
  const incompleteTasks = tasks.filter((task) => task.isCompleted === false);

  // Effect to fetch tasks when user is authenticated
  React.useEffect(() => {
    if (user) {
      allTasks();
    }
  }, [user]);

  // Effect to delete overdue tasks periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach((task) => {
        const taskDueDate = new Date(task.date);
        if (now - taskDueDate > 24 * 60 * 60 * 1000) {
          // Check if task is overdue (24 hours)
          console.log("Deleting task:", task.id);
          deleteTask(task.id);
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [tasks]);

  // Providing global state and update context to children components
  return (
    <GlobalContext.Provider
      value={{
        theme,
        tasks,
        deleteTask,
        isLoading,
        completedTasks,
        importantTasks,
        incompleteTasks,
        updateTask,
        modal,
        openModal,
        closeModal,
        allTasks,
        collapsed,
        collapseMenu,
        editTask,
      }}
    >
      <GlobalUpdateContext.Provider value={{}}>
        {children}
      </GlobalUpdateContext.Provider>
    </GlobalContext.Provider>
  );
};

export const useGlobalState = () => useContext(GlobalContext);
export const useGlobalUpdate = () => useContext(GlobalUpdateContext);
