<<<<<<< HEAD
"use client";
import { useGlobalState } from "@/app/context/globalProvider";
import axios from "axios";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import styled from "styled-components";
import Button from "../Button/Button";
import { add, plus } from "@/app/utils/Icons";
import { Task } from "@prisma/client";

// Interface for component props
interface Props {
  editTask?: Task; // Optional prop for editing a task
}

// CreateContent component function definition
function CreateContent({ editTask }: Props) {
  // State variables using useState hook
  const [title, setTitle] = useState(""); // Title of the task
  const [description, setDescription] = useState(""); // Description of the task
  const [date, setDate] = useState(""); // Date of the task
  const [completed, setCompleted] = useState(false); // Whether the task is completed
  const [important, setImportant] = useState(false); // Whether the task is important

  // Accessing global state and theme using custom hook
  const { theme, allTasks, closeModal } = useGlobalState();

  // useEffect hook to update state when editTask prop changes
  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description || "");
      setDate(editTask.date);
      setCompleted(editTask.isCompleted);
      setImportant(editTask.isImportant);
    }
  }, [editTask]);

  // Function to handle changes in input fields
  const handleChange = (name: string) => (e: any) => {
    switch (name) {
      case "title":
        setTitle(e.target.value);
        break;
      case "description":
        setDescription(e.target.value);
        break;
      case "date":
        setDate(e.target.value);
        break;
      case "completed":
        setCompleted(e.target.checked);
        break;
      case "important":
        setImportant(e.target.checked);
        break;
      default:
        break;
    }
  };

  // Function to handle form submission
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // Task object to be sent to the server
    const task = {
      title,
      description,
      date,
      completed,
      important,
    };

    try {
      // Sending POST request to server to create a new task
      const res = await axios.post("/api/tasks", task);

      // Handling response from server
      if (res.data.error) {
        toast.error(res.data.error);
      }

      // Handling successful response
      if (!res.data.error) {
        toast.success("Task created successfully.");
        allTasks(); // Refreshing tasks list
        closeModal(); // Closing modal
      }
    } catch (error) {
      // Handling error
      toast.error("Something went wrong.");
      console.log(error);
    }
  };

  // Rendering the component
  return (
    <CreateContentStyled onSubmit={handleSubmit} theme={theme}>
      <h1>Create a Task</h1>
      {/* Input fields for task details */}
      <div className="input-control">
        <label htmlFor="title">Title</label>
        <input
          type="text"
          id="title"
          value={title}
          name="title"
          onChange={handleChange("title")}
          placeholder="e.g, Finish 330 Homework."
        />
      </div>
      <div className="input-control">
        <label htmlFor="description">Description</label>
        <textarea
          value={description}
          onChange={handleChange("description")}
          name="description"
          id="description"
          rows={4}
          placeholder="e.g, Code"
        ></textarea>
      </div>
      <div className="input-control">
        <label htmlFor="date">Date</label>
        <input
          value={date}
          onChange={handleChange("date")}
          type="date"
          name="date"
          id="date"
        />
      </div>
      {/* Toggle for marking task as completed */}
      <div className="input-control toggler">
        <label htmlFor="completed">Toggle Completed</label>
        <input
          checked={completed}
          onChange={handleChange("completed")}
          type="checkbox"
          name="completed"
          id="completed"
        />
      </div>
      {/* Toggle for marking task as important */}
      <div className="input-control toggler">
        <label htmlFor="important">Toggle Important</label>
        <input
          checked={important}
          onChange={handleChange("important")}
          type="checkbox"
          name="important"
          id="important"
        />
      </div>
      {/* Submit button */}
      <div className="submit-btn flex justify-end">
        <Button
          type="submit"
          name="Create Task"
          icon={add}
          padding={"0.8rem 2rem"}
          borderRad={"0.8rem"}
          fw={"500"}
          fs={"1.2rem"}
          background={"rgb(0, 163, 255)"}
        />
      </div>
    </CreateContentStyled>
  );
}

// Styled component for CreateContent
const CreateContentStyled = styled.form`
  > h1 {
    font-size: clamp(1.2rem, 5vw, 1.6rem);
    font-weight: 600;
  }

  color: ${(props) => props.theme.colorGrey1};

  .input-control {
    position: relative;
    margin: 1.6rem 0;
    font-weight: 500;

    @media screen and (max-width: 450px) {
      margin: 1rem 0;
    }

    label {
      margin-bottom: 0.5rem;
      display: inline-block;
      font-size: clamp(0.9rem, 5vw, 1.2rem);

      span {
        color: ${(props) => props.theme.colorGrey3};
      }
    }

    input,
    textarea {
      width: 100%;
      padding: 1rem;

      resize: none;
      background-color: ${(props) => props.theme.colorGreyDark};
      color: ${(props) => props.theme.colorGrey2};
      border-radius: 0.5rem;
    }
  }

  .submit-btn button {
    transition: all 0.35s ease-in-out;

    @media screen and (max-width: 500px) {
      font-size: 0.9rem !important;
      padding: 0.6rem 1rem !important;

      i {
        font-size: 1.2rem !important;
        margin-right: 0.5rem !important;
      }
    }

    i {
      color: ${(props) => props.theme.colorGrey0};
    }

    &:hover {
      background: ${(props) => props.theme.colorPrimaryGreen} !important;
      color: ${(props) => props.theme.colorWhite} !important;
    }
  }

  .toggler {
    display: flex;
    align-items: center;
    justify-content: space-between;

    cursor: pointer;

    label {
      flex: 1;
    }

    input {
      width: initial;
    }
  }
`;

export default CreateContent;
=======
"use client";
import { useGlobalState } from "@/app/context/globalProvider";
import axios from "axios";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import styled from "styled-components";
import Button from "../Button/Button";
import { add, plus } from "@/app/utils/Icons";
import { Task } from "@prisma/client";

// Interface for component props
interface Props {
  editTask?: Task; // Optional prop for editing a task
}

// CreateContent component function definition
function CreateContent({ editTask }: Props) {
  // State variables using useState hook
  const [title, setTitle] = useState(""); // Title of the task
  const [description, setDescription] = useState(""); // Description of the task
  const [date, setDate] = useState(""); // Date of the task
  const [completed, setCompleted] = useState(false); // Whether the task is completed
  const [important, setImportant] = useState(false); // Whether the task is important

  // Accessing global state and theme using custom hook
  const { theme, allTasks, closeModal } = useGlobalState();

  // useEffect hook to update state when editTask prop changes
  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description || "");
      setDate(editTask.date);
      setCompleted(editTask.isCompleted);
      setImportant(editTask.isImportant);
    }
  }, [editTask]);

  // Function to handle changes in input fields
  const handleChange = (name: string) => (e: any) => {
    switch (name) {
      case "title":
        setTitle(e.target.value);
        break;
      case "description":
        setDescription(e.target.value);
        break;
      case "date":
        setDate(e.target.value);
        break;
      case "completed":
        setCompleted(e.target.checked);
        break;
      case "important":
        setImportant(e.target.checked);
        break;
      default:
        break;
    }
  };

  // Function to handle form submission
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // Task object to be sent to the server
    const task = {
      title,
      description,
      date,
      completed,
      important,
    };

    try {
      // Sending POST request to server to create a new task
      const res = await axios.post("/api/tasks", task);

      // Handling response from server
      if (res.data.error) {
        toast.error(res.data.error);
      }

      // Handling successful response
      if (!res.data.error) {
        toast.success("Task created successfully.");
        allTasks(); // Refreshing tasks list
        closeModal(); // Closing modal
      }
    } catch (error) {
      // Handling error
      toast.error("Something went wrong.");
      console.log(error);
    }
  };

  // Rendering the component
  return (
    <CreateContentStyled onSubmit={handleSubmit} theme={theme}>
      <h1>Create a Task</h1>
      {/* Input fields for task details */}
      <div className="input-control">
        <label htmlFor="title">Title</label>
        <input
          type="text"
          id="title"
          value={title}
          name="title"
          onChange={handleChange("title")}
          placeholder="e.g, Finish 330 Homework."
        />
      </div>
      <div className="input-control">
        <label htmlFor="description">Description</label>
        <textarea
          value={description}
          onChange={handleChange("description")}
          name="description"
          id="description"
          rows={4}
          placeholder="e.g, Code"
        ></textarea>
      </div>
      <div className="input-control">
        <label htmlFor="date">Date</label>
        <input
          value={date}
          onChange={handleChange("date")}
          type="date"
          name="date"
          id="date"
        />
      </div>
      {/* Toggle for marking task as completed */}
      <div className="input-control toggler">
        <label htmlFor="completed">Toggle Completed</label>
        <input
          checked={completed}
          onChange={handleChange("completed")}
          type="checkbox"
          name="completed"
          id="completed"
        />
      </div>
      {/* Toggle for marking task as important */}
      <div className="input-control toggler">
        <label htmlFor="important">Toggle Important</label>
        <input
          checked={important}
          onChange={handleChange("important")}
          type="checkbox"
          name="important"
          id="important"
        />
      </div>
      {/* Submit button */}
      <div className="submit-btn flex justify-end">
        <Button
          type="submit"
          name="Create Task"
          icon={add}
          padding={"0.8rem 2rem"}
          borderRad={"0.8rem"}
          fw={"500"}
          fs={"1.2rem"}
          background={"rgb(0, 163, 255)"}
        />
      </div>
    </CreateContentStyled>
  );
}

// Styled component for CreateContent
const CreateContentStyled = styled.form`
  > h1 {
    font-size: clamp(1.2rem, 5vw, 1.6rem);
    font-weight: 600;
  }

  color: ${(props) => props.theme.colorGrey1};

  .input-control {
    position: relative;
    margin: 1.6rem 0;
    font-weight: 500;

    @media screen and (max-width: 450px) {
      margin: 1rem 0;
    }

    label {
      margin-bottom: 0.5rem;
      display: inline-block;
      font-size: clamp(0.9rem, 5vw, 1.2rem);

      span {
        color: ${(props) => props.theme.colorGrey3};
      }
    }

    input,
    textarea {
      width: 100%;
      padding: 1rem;

      resize: none;
      background-color: ${(props) => props.theme.colorGreyDark};
      color: ${(props) => props.theme.colorGrey2};
      border-radius: 0.5rem;
    }
  }

  .submit-btn button {
    transition: all 0.35s ease-in-out;

    @media screen and (max-width: 500px) {
      font-size: 0.9rem !important;
      padding: 0.6rem 1rem !important;

      i {
        font-size: 1.2rem !important;
        margin-right: 0.5rem !important;
      }
    }

    i {
      color: ${(props) => props.theme.colorGrey0};
    }

    &:hover {
      background: ${(props) => props.theme.colorPrimaryGreen} !important;
      color: ${(props) => props.theme.colorWhite} !important;
    }
  }

  .toggler {
    display: flex;
    align-items: center;
    justify-content: space-between;

    cursor: pointer;

    label {
      flex: 1;
    }

    input {
      width: initial;
    }
  }
`;

export default CreateContent;
>>>>>>> 5a009d2f4104189374a3c56a46f2e48f06112e1b
