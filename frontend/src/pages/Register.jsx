import {Button,TextField,Alert,Box, Container,Paper,Typography,IconButton,Snackbar} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {useState,useRef} from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

function Register() {
  // register form data 
  const [data, setData] = useState({
    user: '',
    email: '',
    password: '',
    confirm: '',
  });
  
  // validation state of fields
  const [userState,setUserState]=useState(null);
  const [emailState,setEmailState]=useState(null);
  const [passwordState,setPasswordState]=useState(null);
  const [confirmState,setConfirmState]=useState(null);
  
  // password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Snackbar controls 
  const [snackOpen, setSnackOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [snackSeverity, setSnackSeverity] = useState(null);
  
  const debounceTimers = useRef({});

  // Validation functions
  const validateUsername = (username) => {
    return username.trim().length > 0;
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password) => {
    return /^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9_\-+@]{8,}$/.test(password);
  };

  const validateConfirm = (confirm, password) => {
    return confirm === password && confirm.length > 0;
  };

  // Real-time validation check for button enabling
  const isFormValid = () => {
    return validateUsername(data.user) && 
           validateEmail(data.email) && 
           validatePassword(data.password) && 
           validateConfirm(data.confirm, data.password);
  };

  // handle data changes and update the state of corresponding field
  const updateChanges=(e)=>{
    const { name, value } = e.target;
    
    // Update data first
    const newData = { ...data, [name]: value };
    setData(newData);

    // Immediate validation for button enabling (no debounce)
    if (name === 'user') {
      setUserState(null);
      // Clear existing timer
      clearTimeout(debounceTimers.current.user);
      // Set debounced validation for UI feedback only
      debounceTimers.current.user = setTimeout(() => {
        setUserState(validateUsername(value));
      }, 500); // Reduced from 1500ms to 500ms
    } else if (name === 'email') {
      setEmailState(null);
      clearTimeout(debounceTimers.current.email);
      debounceTimers.current.email = setTimeout(() => {
        setEmailState(validateEmail(value));
      }, 500);
    } else if (name === 'password') {
      setPasswordState(null);
      if(newData.confirm.length > 0){
        setConfirmState(null);
        clearTimeout(debounceTimers.current.confirm);
        debounceTimers.current.confirm = setTimeout(() => {
          setConfirmState(validateConfirm(newData.confirm, value));
        }, 500);
      }
      clearTimeout(debounceTimers.current.password);
      debounceTimers.current.password = setTimeout(() => {
        setPasswordState(validatePassword(value));
      }, 500);
    } else if (name === 'confirm') {
      setConfirmState(null);
      clearTimeout(debounceTimers.current.confirm);
      debounceTimers.current.confirm = setTimeout(() => {
        setConfirmState(validateConfirm(value, newData.password));
      }, 500);
    }
  };

  // submit register request
  const handleSubmit=async(data)=>{
    const body={"username":data.user,"email":data.email,"password":data.password};
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    if (result.error) {
      console.log("error")
      setMessage("Error! Please check all fields and try again!");
      setSnackSeverity('error'); 
      setSnackOpen(true);
    }else{
      console.log(result);
      setMessage("Successfully registered! Taking you to your dashboard...");
      setSnackSeverity('success');
      setSnackOpen(true);
      localStorage.setItem("token", result.token);
      setTimeout(() => {
        navigate("/dashboard");
      }, 4000);
    }
    } catch (error) {
      console.error("Registration error:", error);
    }
  }
  
  const navigate = useNavigate();
  
  return (
    <Box sx={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          {/* title */}
          <Typography 
            variant="h5" 
            align="center" 
            sx={{ fontWeight: 'bold', mb: 3, color: '#FF8A80',}}
          >
            Create an Account
          </Typography>
          {/* register form */}
          <form>
            {/* username field */}
            <TextField
              required
              fullWidth
              label="Username"
              name='user'
              value={data.user}
              sx={{ mb: 2 }}
              onChange={updateChanges}
              onBlur={()=>{
                // Immediate validation on blur
                setUserState(validateUsername(data.user));
              }}
              error={userState === false}
              helperText={
                userState === false ? "Please enter a valid username" : " "
              }
              slotProps={{
                input: {
                  endAdornment: userState === null ? null : (
                    <InputAdornment position="end">
                      {userState ? (
                        <CheckCircleIcon sx={{ color: 'green' }} />
                      ) : (
                        <CancelIcon sx={{ color: 'red' }} />
                      )}
                    </InputAdornment>
                  )
                }
              }}
            />
            
            {/* email field */}
            <TextField
              required
              fullWidth
              label="Email"
              name='email'
              value={data.email}
              sx={{ mb: 2 }} 
              onChange={updateChanges}
              onBlur={()=>{
                setEmailState(validateEmail(data.email));
              }}
              error={emailState === false}
              helperText={
                emailState === false ? "Please enter a valid email address" : " "
              }
              slotProps={{
                input: {
                  endAdornment: emailState === null ? null : (
                    <InputAdornment position="end">
                      {emailState ? (
                        <CheckCircleIcon sx={{ color: 'green' }} />
                      ) : (
                        <CancelIcon sx={{ color: 'red' }} />
                      )}
                    </InputAdornment>
                  )
                }
              }}
            />
            
            {/* password field */}
            <TextField
              required
              fullWidth
              label="Password"
              name="password"
              value={data.password}
              type={showPassword ? 'text' : 'password'}
              onChange={updateChanges}
              sx={{ mb: 2 }} 
              onBlur={()=>{
                setPasswordState(validatePassword(data.password));
                // Also check confirm password if it has content
                if (data.confirm.length > 0) {
                  setConfirmState(validateConfirm(data.confirm, data.password));
                }
              }}
              helperText={
                passwordState === false
                  ? "Password does not meet the requirements."
                  : "At least 8 characters including letters and numbers, only a-z, A-Z, 0-9, _, -, +, @"
              }
              error={passwordState === false}
              InputProps={{
                endAdornment:(
                  <InputAdornment position="end" sx={{ display: 'flex', alignItems: 'center' }}>
                    {passwordState !== null && (
                      passwordState ? (
                        <CheckCircleIcon sx={{ color: 'green', mr: 1 }} />
                      ) : (
                        <CancelIcon sx={{ color: 'red', mr: 1 }} />
                      )
                    )}
                    <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            {/* confirmation field */}
            <TextField
              required
              fullWidth
              label="Confirm password"
              name='confirm'
              value={data.confirm}
              onChange={updateChanges}
              type={showConfirmPassword ? 'text' : 'password'}
              onBlur={() => {
                setConfirmState(validateConfirm(data.confirm, data.password));
              }}
              error={confirmState === false}
              helperText={
                confirmState === false ? "Passwords do not match." : " "
              }
              sx={{ mb: 2 }} 
              InputProps={{
                endAdornment:(
                  <InputAdornment position="end" sx={{ display: 'flex', alignItems: 'center' }}>
                    {confirmState !== null && (
                      confirmState ? (
                        <CheckCircleIcon sx={{ color: 'green', mr: 1 }} />
                      ) : (
                        <CancelIcon sx={{ color: 'red', mr: 1 }} />
                      )
                    )}
                    <IconButton onClick={() => setShowConfirmPassword((prev) => !prev)} edge="end">
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            {/* registration button - now uses real-time validation */}
            <Button 
              variant="contained" 
              type="submit" 
              fullWidth 
              sx={{ mb: 3, backgroundColor: '#FF8A80',py: 1.5}} 
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(data);
              }}
              disabled={!isFormValid()} // Real-time validation, no waiting for debounce
            >
              Register
            </Button>
            
            {/* Login button to back to the login page*/}
            <Button 
              variant="contained" 
              fullWidth 
              sx={{ mb: 3, backgroundColor:'#FFFFFF', color: '#FF8A80',py: 1.5}} 
              onClick={() => navigate('/login')}
            >
              LogIn
            </Button>
          </form>
        </Paper>
      </Container>
      
      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackSeverity} onClose={() => setSnackOpen(false)}>
          {message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Register