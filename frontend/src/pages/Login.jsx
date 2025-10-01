import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Avatar,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import logoImage from '../assets/logo.png';

const Login = () => {
  // State management: form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  // State management: password visibility toggle
  const [showPassword, setShowPassword] = useState(false);
  
  // State management: error messages
  const [error, setError] = useState('');
  
  // Navigation hook for routing
  const navigate = useNavigate();

  // Handle form submission: login logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include', // allow cookies (session)
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const txt = await res.json().catch(() => ({}));
        setError(txt.error || 'Login failed');
        return;
      }

      // Get response data and save token
      const data = await res.json();
      
      console.log('Login response:', data);
      
      // Save token to localStorage
      if (data.token) {
        localStorage.setItem("token", data.token);
        console.log('Token saved:', data.token);
      } else if (data.accessToken) {
        localStorage.setItem("token", data.accessToken);
        console.log('AccessToken saved:', data.accessToken);
      } else {
        console.log('No token found in response');
      }

      // Save user info if available
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // On success, navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error');
    }
  };

  // Handle input field changes: update form data
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Toggle password visibility
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        m: 0,
        p: 0,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #f0f0f0',
            '@media (max-width: 400px)': {
              width: '100%',
              margin: '10px',
              padding: '10px',
            },
          }}
        >
          {/* Logo section */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Avatar
              sx={{
                width: 170,
                height: 170,
                mb: 2,
                backgroundColor: '#ffffff',
                border: '3px solid #FF8A80',
                boxShadow: '0 4px 20px rgba(255, 138, 128, 0.3)',
                '& img': {
                  width: '90%',
                  height: '90%',
                  objectFit: 'contain',
                },
              }}
            >
              <img
                src={logoImage}
                alt="CollabMate Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML =
                    '<Typography sx={{fontSize: "1.5rem", color: "#FF8A80", fontWeight: "bold"}}>CM</Typography>';
                }}
              />
            </Avatar>
          </Box>

          {/* Login form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Email input field */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#FF8A80',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#FF8A80',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#FF8A80',
                },
              }}
            />

            {/* Password input field */}
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#FF8A80',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#FF8A80',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#FF8A80',
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleClickShowPassword}
                      edge="end"
                      sx={{ color: '#FF8A80' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Login button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                height: '48px',
                fontSize: '1.1rem',
                backgroundColor: '#FF8A80',
                boxShadow: '0 4px 20px rgba(255, 138, 128, 0.3)',
                '&:hover': {
                  backgroundColor: '#FF7043',
                },
              }}
            >
              Login
            </Button>
            
            {/* Error message display */}
            {error && (
              <Typography color="error" sx={{ mt: 1, textAlign: 'center' }}>
                {error}
              </Typography>
            )}
          </form>

          {/* Register link */}
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography
              variant="body2"
              sx={{
                color: '#666',
                cursor: 'pointer',
                '&:hover': {
                  color: '#FF8A80',
                },
              }}
              onClick={() => navigate('/register')}
            >
              Don&apos;t have an account? Register
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;