# ToDo React

# Setup
- Make sure you've followed the instructions [here](todo_setup_instructions.md) and have a working React app that is published to Github Pages.
- If you're using Bootstrap, jQuery, or another framework that you're loading via a CDN, copy your `<link>` or `<script>` tags that load the frameworks into `public/index.html`.
  - CSS you will want to load above the existing `<link rel="manifest" href="%PUBLIC_URL%/manifest.json">` line.
  - jQuery, etc you will want to place right before the closing `</body>` tag.
  - Note: you DO NOT need to load any of your custom CSS files here, React will do that for us. Only add frameworks or tools that you're loading via CDN, like Bootstrap or Font Awesome.
- Copy all of your CSS into `src/App.css`.

# ToDo Component
- Create two new files in the `src` directory - `Todo.js` and `Todo.css`.
- Copy the existing `App.js` file into `Todo.js` and change the following:
  - `import './App.css';` **->** `import './Todo.css';`
  - `function App() {` **->** `function Todo() {`
  - `export default App` **->** `export default Todo;`
- Copy your HTML for one ToDo into the `return()` section, replacing the HTML that is currently there.
  - Rename any "class" attributes to "className"
  - Example (this will be unique for you, use the HTML you already wrote in the previous assignment):
  ```
  return (
    <div id="01234" className="todo">
      <button className="complete">Check</button>
      <p>Do A thing</p>
    </div>
  );
  ```
- Move any CSS related to each ToDo from `src/App.css` into `src/Todo.css`
- In your `App.js` file, after the existing `import` statements add the line `import Todo from './Todo';`
- In your `App.js` file, modify the HTML to match the HTML structure for your ToDo app, minus the HTML for each ToDo, and the HTML for your new ToDo form.
  - Note, you need one container element
  - Example (this will be unique for you, use the HTML you already wrote in the previous assignment):
  ```
  return (
    <section id="myTodos">
    </section>
  );
  ```
- Next, add your Todo component inside your container element.
  - Example:
  ```
  return (
    <section id="todos">
      <Todo />
    </section>
  );
  ```
- Make sure you have your app running by running `npm start` in your terminal, and go to the page at `http://localhost:3000`.

# Form Component
- Next, add a `NewTodo.js` and `NewTodo.css` file in your `src` directory.
- Move any CSS related to your new Todo form from `src/App.css` to `src/NewTodo.css`
- Copy the contents of `src/Todo.js` into `src/NewTodo.js` and change the following lines:
  - `import './Todo.css'` **->** `import './NewTodo.css';`
  - `function Todo() {` **->** `function NewTodo() {`
  - `export default Todo;` **->** `export default NewTodo;`
- Add the HTML related to your new Todo form inside the `return (` function, replacing the existing HTML that should be related to each ToDo with your form HTML.
  - Example (this will be unique for you, use the HTML you already wrote in the previous assignment):
  ```
  return (
    <div id="myTodoForm">
      <form>
        <input type="text" />
      </form>
    </div>
  );
  ```
- Add the following line to your `src/App.js`, right below the existing `import` statements:
  - `import NewTodo from './NewTodo';`
- Add your new `NewTodo` component the same way you added the `ToDo` component, right above the `<Todo />` line.
  - Example:
  ```
  return (
    <section id="todos">
      <NewTodo />
      <Todo />
    </section>
  );
  ```
- Refresh your page and you should now see your new Todo form and one example Todo.