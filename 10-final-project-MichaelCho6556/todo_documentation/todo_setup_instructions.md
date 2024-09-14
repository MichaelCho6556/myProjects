# Prerequisites
- Make sure you have a terminal application on your computer. On Mac, the default "terminal" application will work. On Windows, use the command prompt, or another terminal program. If using the VS Code editor, a terminal is built in.
  - **Windows Users:** If you get an error when running `npm deploy` in the command prompt, try installing an alternative terminal application. One of the following should work:
    - Cmder: http://cmder.net (use the "git for windows" version)
    - MSGIT: https://gitforwindows.org
- Try running `git --version` in your terminal. If you get an error, install git from here: https://git-scm.com/downloads 
- Install Node.js which includes `npm`. To test if you have this installed, run `npm -v` and if it is installed, you should see a number output with the current version. Make sure it is greater than or equal to `9.5.1`.
- If `npm` is not installed, go here to install Node.js: https://nodejs.org/en/

# Setup
- First, a few steps are required to get your React app deployed to Github Pages.
  - Open the `package.json` file and on the second line, replace "username" in "https://cse204-2023.github.io/09-todo-react-username" with your Group username. Save the file, make a commit in the Github app, and push to Github.
- In your terminal application, navigate to your repo folder.
  - Run `npm install` which will install the dependencies for the React application using npm. You will see a new "node_modules" folder in your project.

# Running Your App
- React must be compiled in order to load in the browser. The "todo-react" project was created using a tool called "create-react-app" which includes a built-in tool that will compile after any chages and reload your page. You will use this while building your page.
  - In your terminal application, navigate to your repo folder.
  - Run `npm run start` or, as shortcut, `npm start`
  - The url "http://localhost:3000" should automatically open in your browser. If not, open it. You should see a heading "ToDo App".
  - In your code editor, open your repository and find the `src/App.js` file. This contains the code for your React app. Add your name to an "h1" tag so that it reads "YOURNAME's ToDo App".
  - Save the file and switch back to your browser. The page should automatically reload and you should see your changes.
  - When done, you can stop the local server by opening your terminal and typing "ctrl-c"
  
# Deploying Your App
- When ready to deploy your app to Github Pages, run `npm run deploy` in your project directory.
  - This will first run, automagically, 'npm run predeploy', which is set to call 'npm run build', which is set to call 'react-scripts build', which will ultimately make a production build (compiled/minified version) of your project in a folder called 'build'. You will see this new folder created.
  - Once the predeploy/build process is complete, 'gh-pages -d build' will be called, which is an external library that will create a new branch in your repo called `gh-pages` and deploy the 'build' folder tot that branch.
    - Note, please **do not modify** this branch directly. You shouldn't ever commit to it directly, let the `npm run deploy` command handle it for you.
  - If there are no errors, go to the Github Pages url and see your App running!
  - If you see an error, make sure you have git installed from here: https://git-scm.com/downloads.
  - If you have installed git but are still seeing an error, and are on Windows, try installing an alternative terminal tool, one of the two listed above.
  - Open your repo in Github and go to the "settings" tab and scroll down to the "Github Pages" section. Make sure the "gh-pages" branch is selected instead of the "master" branch, and change it if needed.
