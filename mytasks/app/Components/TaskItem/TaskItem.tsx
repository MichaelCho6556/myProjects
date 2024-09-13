"use client";
import { useGlobalState } from "@/app/context/globalProvider";
import { edit, trash } from "@/app/utils/Icons";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import formatDate from "@/app/utils/formatDate";

// Interface defining props for TaskItem component
interface Props {
  title: string;
  description: string;
  date: string;
  isCompleted: boolean;
  isImportant: boolean;
  id: string;
}

// TaskItem component function definition
function TaskItem({ title, description, date, isCompleted, id }: Props) {
  // Accessing global state using custom hook
  const { theme, deleteTask, updateTask, editTask, allTasks } =
    useGlobalState();
  // State variable to track editing mode
  const [isEditing, setIsEditing] = useState(false);
  // State variable to hold task data
  const [taskData, setTaskData] = useState({
    title,
    description,
    date,
    isCompleted,
    isImportant: false,
  });

  // Function to toggle editing mode
  const toggleEdit = () => {
    if (!isEditing) {
      editTask(); // Fetch the latest task data when entering edit mode
    }
    setIsEditing(!isEditing);
  };

  // Function to save edits
  const saveEdits = () => {
    editTask(taskData); // Assume updateTask now accepts a full task object
    setIsEditing(false);
  };

  // Function to toggle task importance
  const toggleImportant = () => {
    const updatedImportance = !taskData.isImportant;
    setTaskData((prevState) => ({
      ...prevState,
      isImportant: updatedImportance,
    }));
    if (!isEditing) {
      updateTask({ ...taskData, isImportant: updatedImportance });
    }
  };

  // Rendering the component
  return (
    <TaskItemStyled theme={theme}>
      {isEditing ? ( // Render input fields in editing mode
        <>
          <input
            type="text"
            value={taskData.title}
            onChange={(e) =>
              setTaskData({ ...taskData, title: e.target.value })
            }
          />
          <textarea
            value={taskData.description}
            onChange={(e) =>
              setTaskData({ ...taskData, description: e.target.value })
            }
          />
          <input
            type="date"
            value={taskData.date}
            onChange={(e) => setTaskData({ ...taskData, date: e.target.value })}
          />

          <div className="input-control toggler">
            <label>
              <input
                type="checkbox"
                checked={taskData.isImportant}
                onChange={toggleImportant}
              />{" "}
              Toggle Important
            </label>
          </div>
        </>
      ) : (
        // Render task details in view mode
        <>
          <h1>{taskData.title}</h1>
          <p>{taskData.description}</p>
          <p>Due: {new Date(date).toLocaleDateString()}</p>
          <p>Status: {isCompleted ? "Completed" : "Pending"}</p>
        </>
      )}
      {/* Task actions */}
      <div className="task-footer">
        {isCompleted ? ( // Render button to toggle task completion
          <button
            className="completed"
            onClick={() => {
              const task = {
                id,
                isCompleted: !isCompleted,
              };
              updateTask(task);
            }}
          >
            Completed
          </button>
        ) : (
          <button
            className="incomplete"
            onClick={() => {
              const task = {
                id,
                isCompleted: !isCompleted,
              };
              updateTask(task);
            }}
          >
            Incomplete
          </button>
        )}
        {/* Render edit and delete buttons */}
        {isEditing ? ( // Render save button in editing mode
          <button className="save" onClick={saveEdits}>
            Save
          </button>
        ) : (
          <>
            <button className="edit" onClick={toggleEdit}>
              {edit}
            </button>
            <button className="delete" onClick={() => deleteTask(id)}>
              {trash}
            </button>
          </>
        )}
      </div>
    </TaskItemStyled>
  );
}

// Styled component for TaskItem
const TaskItemStyled = styled.div`
  padding: 1.2rem 1rem;
  border-radius: 1rem;
  background-color: ${(props) => props.theme.borderColor2};
  box-shadow: ${(props) => props.theme.shadow7};
  border: 2px solid ${(props) => props.theme.borderColor2};

  height: 16rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .date {
    margin-top: auto;
  }

  > h1 {
    font-size: 1.5rem;
    font-weight: 600;
  }

  .task-footer {
    display: flex;
    align-items: center;
    gap: 1.2rem;

    button {
      border: none;
      outline: none;
      cursor: pointer;

      i {
        font-size: 1.4rem;
        color: ${(props) => props.theme.colorGrey2};
      }
      &.edit,
      &.save {
        margin-left: auto;
      }
    }

    .edit {
      margin-left: auto;
    }

    .completed,
    .incomplete {
      display: inline-block;
      padding: 0.4rem 1rem;
      background: ${(props) => props.theme.colorDanger};
      border-radius: 30px;
    }

    .completed {
      background: ${(props) => props.theme.colorGreenDark} !important;
    }
  }
`;

export default TaskItem;
