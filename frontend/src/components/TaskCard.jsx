import { useState } from "react";
import React from "react";
import {Card,CardContent,Typography,IconButton,Box,Button,Dialog,DialogActions,DialogTitle,DialogContent,DialogContentText} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccessAlarmIcon from '@mui/icons-material/AccessAlarm';
import EditTaskDialog from "./EditTaskDialog";
function TaskCard({task,color,onDeleted,onTaskUpdated,members}){
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };
  const [editOpen,setEditOpen]=useState(false);
  const handleEditOpen = () => {
    setEditOpen(true);
  };
  const handleEditClose = () => {
    setEditOpen(false);
  };
  const handleUpdated = (updatedTask) => {
    onTaskUpdated?.(updatedTask);
    setEditOpen(false);
  };
  const token = localStorage.getItem('token');
  const deleteTask=async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/task/${task.taskId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to delete task');
      }
      onDeleted?.(task.taskId);
      setOpen(false);
    } catch (err) {
      console.error('Delete failed:', err);
      setOpen(false);
    }
  }
  const computeLeft = (deadline) => {
    if (!deadline){
      return null;
    }else{
      const nowTime = new Date();
      const today=nowTime.toISOString().split('T')[0];
      const days=Math.floor((new Date(deadline)-new Date(today)) / (1000 * 60 * 60 * 24));
      return days;
    }
  };
  const left=computeLeft(task.deadline);
  return (
    <>
      <Card variant="outlined" sx={{ 
        borderRadius: 3,
        display: "flex",
        marginBottom: 1,
        "&:hover": {
            borderColor: color,
            borderWidth: '2px'
        }}}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <CardContent sx={{
          width: "100%",
          alignItems: "center",
          py: 1.5,
          px: 2,
          "&:last-child": { pb: 1.5 }
        }}>
          <Box sx={{width: "100%",display: "flex", alignItems: "center",justifyContent: "space-between"}}>
            <Typography sx={{
              fontSize: "16px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden", 
              textOverflow: "ellipsis",
              maxWidth: "calc(100% - 70px)"
            }}>
              {task.title}
            </Typography>
            {task.gitlabIssueId && !hovered &&(
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: "2px solid #F4B400",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mr: 0.5
                }}
              >
                <Typography
                  sx={{
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#F4B400",
                    lineHeight: 1,
                  }}
                >
                  G
                </Typography>
              </Box>
            )}
            {hovered && (
              <Box>
                <IconButton sx={{ borderRadius: '50%', mr: 1 ,p: 0.6}}>
                  <BorderColorIcon sx={{ fontSize: 20 }} onClick={handleEditOpen}/>
                </IconButton>
                <IconButton sx={{ borderRadius: '50%',p: 0.6}}>
                  <DeleteIcon sx={{ fontSize: 20 }} onClick={handleClickOpen}/>
                </IconButton>
              </Box>
            )}
          </Box>
          <Box sx={{width: "100%",display: "flex", alignItems: "center",gap: 1,color: "#5e6c84"}}>
            <AccessAlarmIcon  sx={{ fontSize: 20}}/>
            <Typography variant="body2">{left == null ? "No deadline" : `${left} ${left<=1?"day":"days"}`}</Typography>
          </Box>
        </CardContent>
      </Card>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Do you want to remove this task from the list?"}
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "#D32F2F"
          }}
        >
          <WarningAmberIcon/>
          <DialogContentText id="alert-dialog-description">
            Please note: Deleted tasks cannot be recovered
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button 
            onClick={deleteTask} 
            autoFocus
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
      <EditTaskDialog 
        open={editOpen} 
        onClose={handleEditClose} 
        task={task} 
        onTaskUpdated={handleUpdated}
        members={members}
      />
    </>
  )
}
export default TaskCard;