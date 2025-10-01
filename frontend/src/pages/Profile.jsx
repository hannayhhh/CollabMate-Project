import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Divider,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon,
  CameraAlt as CameraIcon,
  PhotoCamera as PhotoCameraIcon,
} from "@mui/icons-material";

const API_BASE = import.meta.env.VITE_API_URL;

const Profile = () => {
  const [userInfo, setUserInfo] = useState({
    userId: "",
    username: "",
    email: "",
    phone: "",
    role: "",
    status: "",
    joinDate: "",
    image: "",
  });
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Get auth token
  const getAuthToken = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    console.log('Token found:', token ? 'YES' : 'NO');
    console.log('Token preview:', token ? token.substring(0, 50) + '...' : 'null');
    return token;
  };

  // Decode JWT to get user ID
  const decodeToken = (token) => {
    try {
      const base64 = token.split(".")[1];
      const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(json);
    } catch {
      return {};
    }
  };

  // Generate user initials
  const getUserInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0]?.toUpperCase())
      .join("");
  };

  // Image compression function - balanced quality and size
  const compressImage = (file, maxWidth = 200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height;
            height = maxWidth;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Clear canvas and draw compressed image
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            console.log(`Image compressed: ${(file.size/1024).toFixed(1)}KB to ${(blob.size/1024).toFixed(1)}KB`);
            resolve(blob);
          } else {
            reject(new Error('Compression failed'));
          }
        }, 'image/jpeg', quality);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Convert file/blob to base64
  const fileToBase64 = (fileOrBlob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileOrBlob);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Handle avatar upload with compression
  const handleAvatarChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Selected file:', file.name, `${(file.size/1024).toFixed(1)}KB`);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, GIF, etc.).');
      return;
    }

    // Validate original file size
    if (file.size > 5 * 1024 * 1024) {  // 5MB
      setError('Original image is too large. Please choose an image smaller than 5MB.');
      return;
    }

    try {
      setError(null);
      
      // Compress the image
      const compressedFile = await compressImage(file);
      
      // Convert to base64
      const base64String = await fileToBase64(compressedFile);
      
      // Check base64 size
      const base64SizeKB = Math.round((base64String.length * 3) / 4 / 1024);
      console.log(`Base64 size: ${base64SizeKB}KB`);
      
      // Limit base64 to 500KB - much more reasonable with 5MB backend limit
      if (base64SizeKB > 500) {
        setError('Compressed image is still too large. Please try a smaller image.');
        return;
      }
      
      setAvatarPreview(base64String);
      setEditData(prev => ({ ...prev, image: base64String }));
      
      console.log('Image processed successfully');
      
    } catch (error) {
      console.error('Error processing image:', error);
      setError('Failed to process the image. Please try a different image.');
    }
  };

  // Trigger file input
  const handleAvatarClick = () => {
    if (editMode) {
      fileInputRef.current?.click();
    }
  };

  // Load user profile data
  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login to view your profile.');
        return;
      }

      const { userId } = decodeToken(token);
      if (!userId) {
        setError('Invalid session. Please login again.');
        return;
      }

      console.log('Loading profile for userId:', userId);

      const response = await fetch(`${API_BASE}/user/${userId}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Profile response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Profile data received:', data);
        
        const profile = data.profile || {};
        
        setUserInfo({
          userId: profile.userId || userId,
          username: profile.username || "User",
          email: profile.email || "",
          phone: profile.phone || "",
          role: profile.role || "Member",
          status: profile.status || "offline",
          joinDate: profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Recently",
          image: profile.image || "",
        });
        
        setError(null);
      } else if (response.status === 404) {
        console.warn('Profile endpoint not found, trying fallback...');
        
        const tokenData = decodeToken(token);
        setUserInfo({
          userId: tokenData.userId || userId,
          username: tokenData.username || tokenData.name || "User",
          email: tokenData.email || "",
          phone: "",
          role: tokenData.role || "Member",
          status: "offline",
          joinDate: "Recently",
          image: "",
        });
        
        setError('Profile service not available. Showing basic information.');
      } else {
        throw new Error(`Failed to load profile: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      
      // Fallback: try to extract info from token
      try {
        const token = getAuthToken();
        const tokenData = decodeToken(token);
        console.log('Token data fallback:', tokenData);
        
        setUserInfo({
          userId: tokenData.userId || "unknown",
          username: tokenData.username || tokenData.name || "User",
          email: tokenData.email || "",
          phone: "",
          role: tokenData.role || "Member",
          status: "offline",
          joinDate: "Recently",
          image: "",
        });
        
        setError('Failed to load profile from server. Showing information from session.');
      } catch (tokenError) {
        console.error('Token decode error:', tokenError);
        setError('Failed to load profile information.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login to update your profile.');
        return;
      }

      console.log('Saving profile for user:', userInfo.userId);
      
      // Build request body - only send fields that actually changed
      const requestBody = {};
      
      if (editData.username && editData.username !== userInfo.username) {
        requestBody.username = editData.username;
      }
      if (editData.email && editData.email !== userInfo.email) {
        requestBody.email = editData.email;
      }
      if (editData.phone && editData.phone !== userInfo.phone) {
        requestBody.phone = editData.phone;
      }
      if (editData.role && editData.role !== userInfo.role) {
        requestBody.role = editData.role;
      }
      if (editData.image && editData.image !== userInfo.image) {
        requestBody.image = editData.image;
        console.log('Including image update');
      }

      console.log('Request body fields:', Object.keys(requestBody));

      const response = await fetch(`${API_BASE}/user/${userInfo.userId}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Profile updated successfully:', data);
        
        // Update local state
        setUserInfo(prev => ({
          ...prev,
          username: editData.username || prev.username,
          email: editData.email || prev.email,
          phone: editData.phone || prev.phone,
          role: editData.role || prev.role,
          image: editData.image || prev.image,
        }));
        
        const updateEvent = new CustomEvent('userProfileUpdated', {
          detail: {
            name: editData.username || userInfo.username,
            username: editData.username || userInfo.username,
            avatarUrl: editData.image || userInfo.image,
            role: editData.role || userInfo.role,
            updatedBy: 'profile_component',
          }
        });
        window.dispatchEvent(updateEvent);
        console.log('Profile update event dispatched:', updateEvent.detail);

        const avatarUpdateEvent = new CustomEvent('userAvatarUpdated', {
          detail: {
            userId: userInfo.userId,
            avatarUrl: editData.image || userInfo.image,
            username: editData.username || userInfo.username
          }
        });

        window.dispatchEvent(avatarUpdateEvent);
        console.log('Avatar update event dispatched for Team components');

        setEditMode(false);
        setAvatarPreview(null);
        setSuccess('Profile updated successfully!');
        
        setTimeout(() => setSuccess(null), 3000);
        
      } else {
        // Detailed error handling
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        console.error('Save failed:', response.status, errorData);
        
        if (response.status === 401) {
          setError('Authentication failed. Please login again.');
        } else if (response.status === 413) {
          setError('Image too large for server. Try a much smaller image.');
        } else if (response.status === 400) {
          setError(errorData.error || 'Invalid data provided.');
        } else if (response.status === 404) {
          setError('User profile not found.');
        } else {
          setError(`Server error (${response.status}): ${errorData.error || 'Unknown error'}`);
        }
      }
      
    } catch (error) {
      console.error('Network error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to save profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle edit mode
  const handleEditClick = () => {
    setEditData({
      username: userInfo.username,
      email: userInfo.email,
      phone: userInfo.phone,
      role: userInfo.role,
      image: userInfo.image,
    });
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditData({});
    setAvatarPreview(null);
  };

  useEffect(() => {
    loadUserProfile();
  }, []);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh' 
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 700, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#172b4d", mb: 1 }}>
          My Profile
        </Typography>
        <Typography variant="body1" sx={{ color: "#5e6c84" }}>
          Manage your personal information and account settings
        </Typography>
      </Box>

      {/* Success/Error Messages */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Profile Card */}
      <Card sx={{ 
        borderRadius: 3, 
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
        border: "1px solid #e4e6ea" 
      }}>
        <CardContent sx={{ p: 4 }}>
          {/* Profile Header */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box sx={{ position: 'relative', mb: 3 }}>
              <Avatar
                src={avatarPreview || userInfo.image}
                alt={userInfo.username}
                sx={{
                  width: 100,
                  height: 100,
                  background: "linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)",
                  fontSize: "2.5rem",
                  fontWeight: 600,
                  cursor: editMode ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  '&:hover': editMode ? {
                    transform: 'scale(1.05)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                  } : {}
                }}
                onClick={handleAvatarClick}
              >
                {!avatarPreview && !userInfo.image && getUserInitials(userInfo.username)}
              </Avatar>
              
              {/* Camera overlay for edit mode */}
              {editMode && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: '#1976d2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    '&:hover': {
                      backgroundColor: '#1565c0',
                      transform: 'scale(1.1)'
                    }
                  }}
                  onClick={handleAvatarClick}
                >
                  <PhotoCameraIcon sx={{ color: 'white', fontSize: 16 }} />
                </Box>
              )}
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </Box>
            
            {/* Upload Avatar Button */}
            {editMode && (
              <Button
                variant="outlined"
                startIcon={<PhotoCameraIcon />}
                onClick={handleAvatarClick}
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#1976d2',
                  color: '#1976d2',
                  '&:hover': {
                    borderColor: '#1565c0',
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                  }
                }}
              >
                {userInfo.image || avatarPreview ? 'Change Avatar' : 'Upload Avatar'}
              </Button>
            )}
            
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, textAlign: 'center' }}>
              {userInfo.username}
            </Typography>
            
            <Typography variant="body1" sx={{ color: "#5e6c84", mb: 1 }}>
              ID: {userInfo.userId}
            </Typography>
            
            <Typography variant="body2" sx={{ color: "#5e6c84", mb: 3 }}>
              Member since {userInfo.joinDate}
            </Typography>

            {!editMode && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEditClick}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Edit Profile
              </Button>
            )}
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Profile Information */}
          <Box sx={{ maxWidth: 500, mx: 'auto' }}>
            {/* Full Name */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 3, 
              mb: 2, 
              borderRadius: 2, 
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef'
            }}>
              <PersonIcon sx={{ mr: 3, color: '#6c757d', fontSize: 24 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#495057', mb: 0.5 }}>
                  Full Name
                </Typography>
                {editMode ? (
                  <TextField
                    fullWidth
                    value={editData.username}
                    onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                    variant="outlined"
                    size="small"
                  />
                ) : (
                  <Typography variant="body1" sx={{ color: '#6c757d', fontSize: '1rem' }}>
                    {userInfo.username || 'Not provided'}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Email Address */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 3, 
              mb: 2, 
              borderRadius: 2, 
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef'
            }}>
              <EmailIcon sx={{ mr: 3, color: '#6c757d', fontSize: 24 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#495057', mb: 0.5 }}>
                  Email Address
                </Typography>
                {editMode ? (
                  <TextField
                    fullWidth
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    variant="outlined"
                    size="small"
                  />
                ) : (
                  <Typography variant="body1" sx={{ color: '#6c757d', fontSize: '1rem' }}>
                    {userInfo.email || 'Not provided'}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Phone Number */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 3, 
              mb: 2, 
              borderRadius: 2, 
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef'
            }}>
              <PhoneIcon sx={{ mr: 3, color: '#6c757d', fontSize: 24 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#495057', mb: 0.5 }}>
                  Phone Number
                </Typography>
                {editMode ? (
                  <TextField
                    fullWidth
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    variant="outlined"
                    size="small"
                    placeholder="+61 xxx xxx xxx"
                  />
                ) : (
                  <Typography variant="body1" sx={{ color: '#6c757d', fontSize: '1rem' }}>
                    {userInfo.phone || 'Not provided'}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Role */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 3, 
              mb: 4, 
              borderRadius: 2, 
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef'
            }}>
              <WorkIcon sx={{ mr: 3, color: '#6c757d', fontSize: 24 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#495057', mb: 0.5 }}>
                  Role
                </Typography>
                {editMode ? (
                  <TextField
                    fullWidth
                    value={editData.role}
                    onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                    variant="outlined"
                    size="small"
                  />
                ) : (
                  <Typography variant="body1" sx={{ color: '#6c757d', fontSize: '1rem' }}>
                    {userInfo.role || 'Not provided'}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          {/* Edit Mode Actions */}
          {editMode && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4, pt: 3, borderTop: '1px solid #e4e6ea' }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancelEdit}
                disabled={saving}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                onClick={handleSaveProfile}
                disabled={saving || !editData.username?.trim()}
                sx={{
                  backgroundColor: '#1976d2',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: '#1565c0',
                  },
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;