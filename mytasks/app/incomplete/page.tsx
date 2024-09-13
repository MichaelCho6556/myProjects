<<<<<<< HEAD
"use client"
import React from "react";
import { useGlobalState } from "../context/globalProvider";
import Tasks from "../Components/Tasks/Tasks";

function page() {
    const {incompleteTasks} = useGlobalState();
    return <Tasks title="Incomplete Tasks" tasks={incompleteTasks}/>;
}

=======
"use client"
import React from "react";
import { useGlobalState } from "../context/globalProvider";
import Tasks from "../Components/Tasks/Tasks";

function page() {
    const {incompleteTasks} = useGlobalState();
    return <Tasks title="Incomplete Tasks" tasks={incompleteTasks}/>;
}

>>>>>>> 5a009d2f4104189374a3c56a46f2e48f06112e1b
export default page;