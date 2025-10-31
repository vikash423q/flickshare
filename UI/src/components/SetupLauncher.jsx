import { useNavigate } from "react-router-dom";
import "./Setup.css";

function SetupLauncher() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/setup");
  };

  return (
    <div className="setup-container">
      <button className="setup-btn" onClick={handleClick}>
        Setup FlickShare
      </button>
      <p className="version">FlickShare v1.0.0</p>
    </div>
  );
}

export default SetupLauncher;
