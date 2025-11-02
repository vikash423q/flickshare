import * as React from 'react';
import Button from '@mui/material/Button';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function UsersPage({ setViewName }) {
  return (
    <div style={{ textAlign: "center", paddingTop: "40px" }}>

      {/* Back Button Top Left */}
      <div style={{ position: "absolute", top: "10px", left: "10px" }}>
        <IconButton onClick={() => setViewName("start")}>
          <ArrowBackIcon sx={{ color: "black" }} />
        </IconButton>
      </div>

      {/* Admin Icon Top */}
      <div className="user-info">
        <AdminPanelSettingsIcon
          sx={{ verticalAlign: "middle", marginRight: "8px" }}
        />
      </div>

      <h2>Users</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "250px", margin: "0 auto" }}>

        <Button
          variant="contained"
          size="medium"
          color="warning"
          sx={{ textTransform: "none" }}
          fullWidth
        >
          List Users
        </Button>

        <Button
          variant="contained"
          size="medium"
          color="warning"
          sx={{ textTransform: "none" }}
          fullWidth
        >
          Generate Password
        </Button>

      </div>
    </div>
  );
}

export default UsersPage;
