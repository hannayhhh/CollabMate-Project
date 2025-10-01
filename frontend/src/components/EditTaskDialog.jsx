import React, { useState,useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  MenuItem
} from '@mui/material';
import Avatar from '@mui/material/Avatar';

const EditTaskDialog = ({ open, onClose,task,onTaskUpdated,members}) => {
  const token = localStorage.getItem('token');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    userIds: ''
  });
  const [orginal,setOriginal]=useState({
    title: '',
    description: '',
    deadline: '',
    userIds: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        deadline: task.deadline || '',
        userIds: task.userIds[0] || ''
      });
      setOriginal({
        title: task.title || '',
        description: task.description || '',
        deadline: task.deadline || '',
        userIds: task.userIds[0] || ''
      })
    }
  }, [task]);
  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };
  const today = new Date().toISOString().split('T')[0];
  const handleClose = () => {
    setFormData(orginal);
    setErrors({});
    onClose();
  };
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (formData.deadline) {
      const selectedDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.deadline = 'Deadline cannot be in the past';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }
  const saveChanges=async()=> {
    const { title, description, deadline,userIds} = formData;
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/task/${task.taskId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description, deadline,userIds: userIds ? [userIds] : [] })
    });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to update task');
      }
      const updatedTask = await res.json();
      setLoading(false);
      onTaskUpdated?.(updatedTask);
      onClose();
    }catch (error) {
      console.error('Failed to create task:', error);
      setErrors({ submit: 'Failed to create task. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      fullWidth
      scroll="body"
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: 24,
          maxWidth: 525,
          mx: 'auto',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1,px:4.5}}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Task Information
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2,px:4.5}}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Task Title"
            value={formData.title}
            error={!!errors.title}
            helperText={errors.title}
            onChange={handleChange('title')}
            fullWidth
            variant="outlined"
            placeholder="Enter task title..."
            sx={{marginTop:1}}
          />

          <TextField
            label="Description"
            value={formData.description}
            error={!!errors.description}
            helperText={errors.description}
            onChange={handleChange('description')}
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            placeholder="Enter task description..."
          />

          <TextField
            label="Deadline"
            type="date"
            value={formData.deadline}
            error={!!errors.deadline}
            helperText={errors.deadline}
            onChange={handleChange('deadline')}
            fullWidth
            variant="outlined"
            placeholder="Date/Month/Year"
            InputLabelProps={{
              shrink: true,
            }}
            inputProps={{
              placeholder:"Date/Month/Year",
              min: today,
              lang: "en-US" // Force English date format
            }}
            sx={{
              '& input[type="date"]::-webkit-calendar-picker-indicator': {
                cursor: 'pointer',
                width: '24px',
                height: '24px',
                filter: 'invert(0.5)'
              },
              '& input[type="date"]': {
                fontFamily: 'inherit',
              }
            }}
          />
          <TextField
            id="outlined-select-currency"
            select
            label="Assignee"
            value={formData.userIds}
            SelectProps={{
              renderValue: () => {
                const selected = members.find(m => m.userId === formData.userIds);
                return selected?.username || '';
              }
            }}
            sx={{
              marginBottom: 1.5
            }}
            onChange={handleChange("userIds")}
          >
            {members.map((member) => (
              <MenuItem key={member.userId} value={member.userId}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Avatar sx={{ width: 30, height: 30, fontSize: 16}}>
                    {member.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography>{member.username}</Typography>
                </Box>
              </MenuItem>
          ))}
          </TextField>
          {errors.submit && (
            <Typography color="error" variant="body2">
              {errors.submit}
            </Typography>
          )}
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
          disabled={loading}
          onClick={saveChanges}
          sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTaskDialog;