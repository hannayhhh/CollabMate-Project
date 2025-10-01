import React, { useState,useEffect} from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  Typography,
  MenuItem,
  Checkbox,
  ListItemText
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const GitLabDialog = ({ open, onClose,user,onSelect}) => {
  const token = localStorage.getItem("token");
  const API_BASE = import.meta.env.VITE_API_URL;
  const handleClose = () => {
    onClose();
    setSelectedIssueId("");
    setSelectedProjectId("");
    setIssues([]);
  };
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState("");
  const [projectList,setProjectList]=useState([]);
  const [issues,setIssues]=useState([]);
  const getProjects=async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/gitlab/projects`, {
      method: "GET",
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to fetch GitLab projects");
      }
      const data = await res.json();
      setProjectList(data);
      console.log("获得projects")
      console.log(data);
    } catch (err) {
      console.error("fail to fetch projects", err);
    }
  };
  const getOneIssue = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/gitlab/projects/${selectedProjectId}/issues/ids`, {
      method: "GET",
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to fetch corresponding issues");
      }
      const data = await res.json();
      console.log("获得issues");
      console.log(data);
      setIssues(data);
    } catch (err) {
      console.error("Failed to fetch issues", err);
    }
  }
  const importIssue = async (projectId,issueIid) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/gitlab/projects/${projectId}/issues/${issueIid}`, {
      method: "GET",
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to import issue");
      }
      const data = await res.json();
      console.log("import issues");
      console.log(data);
      onSelect?.({projectId,issueIid});
      handleClose();
    } catch (err) {
      console.error("Failed to import issue", err);
    }
  }
  useEffect(() => {
    getProjects()
  }, []);
  useEffect(() =>{
    if(selectedProjectId!==""){
      getOneIssue();
    }
  },[selectedProjectId])
  return (
        <Dialog 
          open={open} 
          onClose={handleClose}
          maxWidth="sm"
          fullWidth
          disableEnforceFocus
          disableRestoreFocus
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: 24,
              maxWidth: 525
            }
          }}
        >
          <DialogTitle sx={{ pb: 1,px: 4.5}}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Select the GitLab Task Source
              </Typography>
              <IconButton
                onClick={handleClose}
                size="small"
                sx={{ color: 'grey.500'}}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
    
          <DialogContent sx={{ pt: 2,px: 4.5}}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                id="outlined-select-currency"
                select
                label="Project"
                value={selectedProjectId}
                sx={{marginTop: 1.5}}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedIssueId("");
                  setIssues([]);
                }}
              >
                {projectList.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </TextField>
    
              <TextField
                id="outlined-select-currency"
                select
                label="Issue"
                value={selectedIssueId}
                sx={{
                  marginBottom: 1.5
                }}
                onChange={(e) => {
                  setSelectedIssueId(e.target.value);
                }}
                disabled={!selectedProjectId||issues.length===0}
              >
                {issues.map((issue)=> (
                  <MenuItem key={issue.issueIid} value={issue.issueIid}>
                    {issue.title}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </DialogContent>
    
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={handleClose}
              variant="outlined"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                px: 3
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                px: 3
              }}
              onClick={() => {
                if(selectedIssueId && selectedProjectId){
                  importIssue(selectedProjectId,selectedIssueId);
                }else{
                  handleClose();
                }
              }}
            >
              Get
            </Button>
          </DialogActions>
        </Dialog>
  )
}

export default GitLabDialog;