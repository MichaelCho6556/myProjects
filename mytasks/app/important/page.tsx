<<<<<<< HEAD
"use client"
import React from "react";
import { useGlobalState } from "../context/globalProvider";
import Tasks from "../Components/Tasks/Tasks";

function page() {
    const {importantTasks} = useGlobalState();
    return <Tasks title="Important Tasks" tasks={importantTasks}/>;
}

=======
"use client"
import React from "react";
import { useGlobalState } from "../context/globalProvider";
import Tasks from "../Components/Tasks/Tasks";

function page() {
    const {importantTasks} = useGlobalState();
    return <Tasks title="Important Tasks" tasks={importantTasks}/>;
}

>>>>>>> 5a009d2f4104189374a3c56a46f2e48f06112e1b
export default page;