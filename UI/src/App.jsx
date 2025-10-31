import { useState } from 'react'
import './App.css' 
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SetupLauncher from "./components/SetupLauncher";
import SetupPage from "./components/SetupPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SetupLauncher />} />
        <Route path="/setup" element={<SetupPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App ;
