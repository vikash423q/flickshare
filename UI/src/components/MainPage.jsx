import { useState } from "react";
import StartPage from "./StartPage";
import SetupPage from "./SetupPage";


const MainPage = () => {
    const [viewName, setViewName] = useState("start");

    const centerView = () => {
      switch(viewName) {

        case "setup":   return <SetupPage setViewName={setViewName}/>;
        case "start":   return <StartPage setViewName={setViewName}/>;
        case "user": return <div />;
        case "settings":  return <div />;
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
