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
  MenuItem
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import Avatar from '@mui/material/Avatar';

const CreateTaskDialog = ({ open, onClose, onTaskCreated ,members=[],user}) => {
  const API_BASE = import.meta.env.VITE_API_URL;
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    userIds: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
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
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      // Get auth token from storage
      const token = localStorage.getItem('token') || 
                   localStorage.getItem('authToken') ||
                   sessionStorage.getItem('token') ||
                   sessionStorage.getItem('authToken');
      
      if (!token) {
        setErrors({ submit: 'Please login first to create tasks.' });
        setLoading(false);
        return;
      }

      // Prepare request headers
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const requestBody = {
        title: formData.title,
        description: formData.description,
        deadline: formData.deadline,
        status: 'To Do',
        userIds: formData.userIds ? [formData.userIds] : [],
        userId: user
      };

      const response = await fetch(`${API_BASE}/task`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle different error types
        if (response.status === 401) {
          setErrors({ submit: 'Authentication failed. Please login again.' });
        } else if (response.status === 403) {
          const errorMsg = errorData.message || errorData.error || 'Access denied';
          setErrors({ submit: `Access denied: ${errorMsg}` });
        } else if (response.status === 400) {
          setErrors({ submit: `Invalid request: ${errorData.message || errorData.error}` });
        } else {
          setErrors({ submit: errorData.message || errorData.error || `Server error (${response.status})` });
        }
        return;
      }
      
      const newTask = await response.json();
      onTaskCreated && onTaskCreated(newTask);
      handleClose();
    } catch (error) {
      console.error('Failed to create task:', error);
      setErrors({ submit: `Failed to create task: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ title: '', description: '', deadline: '', userIds: '' });
    setErrors({});
    onClose();
  };

  const today = new Date().toISOString().split('T')[0];

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
            Create New Task
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
            label="Task Title"
            value={formData.title}
            onChange={handleChange('title')}
            error={!!errors.title}
            helperText={errors.title}
            fullWidth
            variant="outlined"
            placeholder="Enter task title..."
            sx={{marginTop: 1}}
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={handleChange('description')}
            error={!!errors.description}
            helperText={errors.description}
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
            onChange={handleChange('deadline')}
            error={!!errors.deadline}
            helperText={errors.deadline}
            fullWidth
            variant="outlined"
            placeholder="Date/Month/Year"
            InputLabelProps={{
              shrink: true,
            }}
            inputProps={{
              placeholder:"Date/Month/Year",
              min: today,
              lang: "en-US"
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
            disabled={members.length === 0}
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
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            px: 3
          }}
        >
          {loading ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTaskDialog;