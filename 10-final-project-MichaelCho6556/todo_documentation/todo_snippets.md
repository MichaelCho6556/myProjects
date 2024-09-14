# Description
In this file you will find some code snippets and examples of how to do certain things in React.

## Initializating State
- Setting up state with any initial values, may be empty.
```javascript
const [todos, setTodos] = useState([])
```
## Modifying State
- You can use the ES6 [spread operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax) to pass in existing state data and add to it.
```javascript
const result = myAjaxCall();
let newTodos = [result.data, ...todos];
setTodos(newTodos);
```

## Events As Props
- In our Todo application, the list of todos is saved in `todos` in our **container component** which lives in `App.js`. Our form for creating a new Todo exists in our **NewTodo** component inside of `NewTodo.js`. Because _state_ is encapsulated and only available in the component that creates it, our **NewTodo** component cannot access the "global" list of Todos stored in `todos` inside of `App.js`.
- This is a problem when we write our event handler for submitting our **NewTodo** form and we need to save the new Todo in the state.
- The solution is to write our event handlers that need to access _state_ in `App.js` and then pass them to the **NewTodo** component as props. Then, in the **NewTodo** component we attach the event handler method _prop_ to the event, such as `onSubmit`.
- The React solution we've implemented above is referred to as "Lifting State"
```javascript
// App.js

function App() {
  const [todos, setTodos] = useState([]);

  function addTodo(e) {
    //ajax stuff
    let newTodos = [result.data, ...todos];
    setTodos(newTodos);
  }

  return (
    <NewTodo addTodo={addTodo} other={stuff} goes={here} />
  )
}
```

```javascript
// NewTodo.js

return (
  <form onSubmit={addTodo}>
  </form>
)
```

- To recap, we've created our `addTodo` method inside our **App** component and passed to the **NewTodo** component as a prop. Now inside of our **NewTodo** component we can add the method to our `onSubmit` using `addTodo`.

## Sorting Arrays
- Arrays can be sorted using the `.sort()` method, documented [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) and [here](https://www.w3schools.com/jsref/jsref_sort.asp)
- The `.sort()` method can be passed a function which is used to compare each item in the array, and returns whether or not a certain item should be sorted before another item.
  - Sorting ascending by a number property
  ```javascript
  todos.sort(function (a, b) {
    return parseFloat(a.created) - parseFloat(b.created);
  });
  ```
  - Sorting descending by a number property
  ```javascript
  todos.sort(function (a, b) {
    return parseFloat(b.created) - parseFloat(a.created);
  });
  ```
  - Sorting alphabetically using `localCompare` (documented [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare) and [here](https://www.w3schools.com/jsref/jsref_localecompare.asp))
  ```javascript
  todos.sort(function (a, b) {
    return a.text.localeCompare(b.text);
  })
  ```
## Remove Element From Array
- When you delete a Todo, you'll need to remove it from the `todos` array after the DELETE Ajax has completed successfully.
- You can remove elements from an array using `.filter()`. The documentation is [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter).
```javascript
// You need the id of the todo you want to delete as a variable.
const remainingTodos = todos.filter((todo) => {
  // Looping through all todos, if the id of the current todo DOES NOT equal the id of the todo we want to delete, keep it
  if (todo.id !== id) {
    return todo;
  }
});
// Update state with filtered list using setTodos(remainingTodos);
```
## Creating a component for each element in an array
- You will need to create a `<Todo>` component for each element in your todos array. You can do that with the `.map()` method documented [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) and [here](https://www.w3schools.com/jsref/jsref_map.asp).
```javascript
{todos.map((todo) =>
  <Todo key={todo.id} id={todo.id} completed={todo.completed}
    text={todo.text} removeDeletedTodo={removeDeletedTodo}/>
)}
```

## `useEffect()`
- You will need to perform your initial GET Ajax request to load existing Todos once the main **App** container has loaded.
- Do this inside a `useEffect()` method on the **App** container.

```javascript
// App.js
useEffect(() => {

    //ajax stuff
    let newTodos = [result.data, ...todos];
    setTodos(newTodos);

}, []);
```

## Adding a 'completed' class to Todo with an existing class
```
return (
    <div className={`todo-item ${todo.completed ? 'completed' : ''}`}> TODO GOES HERE </div> 
)
```