# Steps to complete to turn Todo app into React
After following the instructions [here](todo_getting_started.md), you should have the following:

- Working react app
- Ability to deploy react app to Github Pages
- `App` component that does initial setup and composes your other components
- `NewTodo` component containing the form for a new Todo
- `Todo` component containing HTML for a single Todo
- CSS files for each component

The next steps are:
1. Make sure you rename any `class` attributes to `className`
2. Add props to your `Todo` component
    - Will probably need the `id` and `text` at a minimum.
    - Render those props instead of having them hardcoded (to test, pass them when you create the component, i.e. `<Todo id="123" text="test" />`
    - Display the props inside the component, in `Todo.js`, i.e. `<p>{text}</p>`
3. Add your AJAX GET call
    - Add a `useState()` hook to your `App` component and initialize it with an empty `todos` array `const [todos, setTodos] = useState([])`.
    - Use a `useEffect()` hook in your `App` component and put your AJAX javascript there.
    - After the AJAX call is complete and successful, update `todos` using `setTodos()` with your new Todo items.
4. Render `Todo` component for each Todo item.
    - Use `.map` and the syntax from the slides to loop through your todos and render a new `<Todo>` for each of them.
    - Make sure to pass a `key` attribute
5. Add event methods for completing and deleting a ToDo
    - Attach them to the buttons using an `onClick` prop.
    - Add your AJAX for completing and deleting inside those methods
    - Update state if necessary
6. Add event method for submitting new Todo form.
    - Attach to your form using an `onSubmit` prop.
    - Add your AJAX for adding new Todos inside the event method
    - Don't forget `event.preventDefault()`
    - Update state with your new Todo.