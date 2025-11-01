import { useState } from "react";
import StartPage from "./StartPage";
import SetupPage from "./SetupPage";


const MainPage = () => {
    const [isSettingUp, setIsSettingUp] = useState(false);

    return (
        <>
            {isSettingUp ? <SetupPage setIsSettingUp={setIsSettingUp}/> : <StartPage setIsSettingUp={setIsSettingUp}/>}
        </>
    );
}   

export default MainPage;
