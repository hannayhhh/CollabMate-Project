import React, { useState, useEffect } from "react";
import {
  Grid,
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import NorthEastOutlinedIcon from '@mui/icons-material/NorthEastOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import gitlab from '../assets/gitlab.png';
function GitLab() {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams(window.location.search);
  const status = params.get("gitlab");
  const [information,setInformation]=useState("");
  const [connected,setConnected]=useState(false);
  const [loading, setLoading] = useState(true);
  const getInformation=async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/gitlab/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
      const data = await res.json();
      if (res.ok){
        setConnected(true);
        setInformation(data);
        console.log(data);
        localStorage.setItem("GitLab","true");
      }
    } catch (err) {
      console.error("Failed to fetch information:", err);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    getInformation();
  }, [status]);
  const handleUnlink=async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/gitlab/unlink`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
      if (res.ok){
        setConnected(false);
        setInformation("");
        localStorage.removeItem("GitLab");
      }
    } catch (err) {
      console.error("Failed to disconnect the GitLab account:", err);
    }
  }
  return (
    <Box sx={{
      backgroundColor: "#f8f9fa",
      minHeight: "100vh",
      p: 3,
    }}>
      <Box sx={{ mb: 4}}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 1,
            display: "inline-block",
            background: "linear-gradient(to right, #1976d2, #9c27b0)",
            backgroundSize: "130%",
            backgroundPosition: "left",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          GitLab
        </Typography>
        <Typography
          variant="body1"
          sx={{ 
            color: "#5e6c84",
            fontWeight: 400}}
        >
          Connect your GitLab account to sync issues and collaborate seamlessly.
        </Typography>
      </Box>
      {loading ? ( 
        <CircularProgress sx={{ mt: 4 }} />
        ) :connected===true? (
        <Card sx={{
          backgroundColor: "#ffffff",
          borderRadius: 4,
          height: 300,
          width: "70%",
          boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e4e6ea",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          paddingTop: 3,
          marginTop: 5,
          marginLeft: 10,
          mx: "auto",
          overflow: "hidden"}}
        > 
          <Box sx={{
            marginLeft: 7,
            display: "flex",
            alignItems: "center",
            gap: 2
          }}>
            <Typography variant="h5" sx={{
              fontWeight: 600,
            }}>
              GitLab  Account
            </Typography>
            <CheckCircleIcon sx={{color: "green"}}/>
          </Box>
          <Typography sx={{
            marginLeft: 7.2,
            marginTop: 1.5
          }}>
            Your gitlab account is now successfully connected. Issuses can be synced.
          </Typography>
          <Box sx={{
            marginLeft: 7,
            marginTop: 2.5,
            display: "flex",
            gap: 4
          }}>
              <img src={gitlab} alt="Create Task Icon" style={{ width: "50px",height: "50px"}} />
              <Box sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 1.2
              }}>
                <Typography>
                  <Box component="span" sx={{color: "gray"}}>
                    UserName :
                  </Box>
                  <Box component="span" sx={{ 
                    color: "black", 
                    fontWeight: 600,
                    marginLeft: 1.5
                  }}>
                    {information.username}
                  </Box>
                </Typography>
                <Typography>
                  <Box component="span" sx={{color: "gray"}}>
                    Email :
                  </Box>
                  <Box component="span" sx={{ 
                    color: "black", 
                    fontWeight: 600,
                    marginLeft: 6
                  }}>
                    {information.commit_email}
                  </Box>
                </Typography>
                <Typography>
                  <Box component="span" sx={{color: "gray"}}>
                    ID :
                  </Box>
                  <Box component="span" sx={{ 
                    color: "black", 
                    fontWeight: 600,
                    marginLeft: 9
                  }}>
                    {information.id}
                  </Box>
                </Typography>
              </Box>
            </Box>
            <Button sx={{
              textTransform: "none",
              width: 200,
              color: "black",
              border: "1px solid black",
              marginLeft: 7.5,
              marginTop: 3.5,
              fontWeight: 500
            }}
              onClick={handleUnlink}
            >
              Disconnect GitLab
            </Button>
        </Card>
        ):(
        <Card sx={{
          backgroundColor: "#ffffff",
          borderRadius: 4,
          height: 300,
          width: "70%",
          boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e4e6ea",
          flexShrink: 0,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 3,
          marginTop: 5,
          marginLeft: 10,
          mx: "auto",
          overflow: "hidden"}}
        >
        <Box sx={{
          width: "30%",
          display: "flex",
          justifyContent: "center",
        }}>
          <img src={gitlab} alt="GitLab Logo" style={{ width: "100px",height: "100px"}} />
        </Box>
        <Box sx={{
          display: "flex",
          flexDirection: "column",
        }}>
          <Typography variant="h5" sx={{
            fontWeight: 600,
          }}>
            Connect Your GitLab Account
          </Typography>
          <Typography sx={{
            marginTop: 1.5
          }}>
            You have not connect any GitLab account. 
          </Typography>
          <Typography sx={{
            marginTop: 1.5
          }}>
           By connecting your GitLab, you can:
          </Typography>
          <Typography sx={{
            marginTop: 1.5
          }}>
           • Sync issues seamlessly
          </Typography>
          <Typography sx={{
            marginTop: 1.5
          }}>
           • Collaborate with your team in real-time
          </Typography>
          <Button variant="contained" sx={{
            textTransform: "none",
            fontSize: "1rem",
            borderRadius: 2,
            marginTop: 3,
            width: 200}}
            onClick={() => {
                window.location.href = `${import.meta.env.VITE_API_URL}/gitlab/login?token=${token}`;
            }}
            endIcon={
              <NorthEastOutlinedIcon />
          }>
            Connect GitLab
          </Button>
        </Box>
        </Card>
        )}
    </Box>
  )
}
export default GitLab