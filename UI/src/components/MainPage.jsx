import { useState } from "react";
import StartPage from "./StartPage";
import SetupPage from "./SetupPage";


const MainPage = () => {
    const [isSettingUp, setIsSettingUp] = useState(false);

    return (
        <div className="main-page">
            {isSettingUp ? <SetupPage /> : <StartPage setIsSettingUp={setIsSettingUp}/>}
        </div>
    );
}   

export default MainPage;
