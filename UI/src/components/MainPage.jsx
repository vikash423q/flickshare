import { useState } from "react";
import StartPage from "./StartPage";
import SetupPage from "./SetupPage";
import UsersPage from "./UsersPage";


const MainPage = () => {
    const [viewName, setViewName] = useState("start");

    const centerView = () => {
      switch(viewName) {

        case "setup":   return <SetupPage setViewName={setViewName}/>;
        case "start":   return <StartPage setViewName={setViewName}/>;
        case "UsersPage":  return <UsersPage setViewName={setViewName} />;
        case "SetupPage":  return <UsersPage setViewName={setViewName} />;
        case "help":     return <div />;

        default:      return <h1>No view match</h1>
      }
    }

    return (
        <>
            {centerView()}
        </>
    );
}   

export default MainPage;
