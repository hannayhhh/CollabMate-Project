import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Avatar
} from "@mui/material";
import {
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";

const API_BASE = import.meta.env.VITE_API_URL;

const TeamStatus = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentTeamId, setCurrentTeamId] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const scrollContainerRef = useRef(null);
  
  const availableRoles = [
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "UI/UX Designer",
    "Project Manager",
    "DevOps Engineer",
    "Quality Assurance",
    "Product Owner",
    "Scrum Master",
    "Tech Lead",
  ];

  // Get auth token
  const getAuthToken = () => localStorage.getItem('token');
  // Get current user ID from token or localStorage
  const getCurrentUserId = () => {
    try {
      const token = getAuthToken();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.id || payload.sub;
      }
    } catch (error) {
      console.warn('Failed to parse token:', error);
    }
    return localStorage.getItem('currentUserId') || null;
  };
  // Generate consistent color for user
  const generateColor = (name) => {
    const colors = [
      "#6366f1", "#f59e0b", "#10b981", "#8b5cf6", 
      "#06b6d4", "#ec4899", "#f97316", "#84cc16",
      "#ef4444", "#3b82f6", "#14b8a6", "#a855f7",
      "#f472b6", "#f59e0b", "#22c55e", "#8b5cf6"
    ];
    // Use a more sophisticated hash to ensure different colors for similar names
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Get last active text based on status (simulated)
  const getLastActiveText = (status) => {
    switch (status) {
      case 'online':
        return 'online now';
      case 'busy':
        return '30m ago';
      case 'offline':
        return '2h ago';
      default:
        return 'recently';
    }
  };

  // Get simulated status based on user activity
  const getSimulatedStatus = (member) => {
    // Simple logic: if user has recent tasks, they're likely active
    if (member.tasksCompleted > 0 && member.totalTasks > 0) {
      const completionRate = member.tasksCompleted / member.totalTasks;
      if (completionRate > 0.8) return 'online';
      if (completionRate > 0.4) return 'busy';
      return 'offline';
    }
    return 'offline';
  };

  // Load teams and current user's team (same logic as Team component)
  const loadTeams = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login first to access teams.');
        return;
      }

      // Check for saved team ID first
      const savedTeamId = localStorage.getItem('currentTeamId');
      if (savedTeamId) {
        const teamExists = await loadTeamById(savedTeamId);
        if (teamExists) {
          return;
        }
      }

      // Try to find user's team from profile
      const currentUserId = getCurrentUserId();
      const profileResponse = await fetch(`${API_BASE}/user/${currentUserId}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (profileResponse.ok) {
        const userData = await profileResponse.json();
        const userTeamId = userData.profile?.teamId;

        if (userTeamId) {
          await loadTeamById(userTeamId);
        } else {
          // User is not in any team
          setTeamInfo(null);
          setTeamMembers([]);
          setCurrentTeamId(null);
          localStorage.removeItem('currentTeamId');
        }
      } else {
        console.warn('Failed to load user profile');
        setTeamInfo(null);
        setTeamMembers([]);
        setCurrentTeamId(null);
        localStorage.removeItem('currentTeamId');
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      setError('Failed to load team data: ' + error.message);
    }
  };

  // Load team by ID (same logic as Team component)
  const loadTeamById = async (teamId) => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login first to access teams.');
        return false;
      }

      const response = await fetch(`${API_BASE}/team/${teamId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const team = await response.json();
        setCurrentTeamId(teamId);
        setTeamInfo(team);
        localStorage.setItem('currentTeamId', teamId);
        
        await loadTeamMembers(teamId);
        return true;
      } else {
        console.warn(`Team ${teamId} not found or access denied`);
        localStorage.removeItem('currentTeamId');
        setTeamInfo(null);
        setTeamMembers([]);
        setCurrentTeamId(null);
        return false;
      }
    } catch (error) {
      console.error('Error loading team:', error);
      setError('Failed to load team: ' + error.message);
      localStorage.removeItem('currentTeamId');
      setTeamInfo(null);
      setTeamMembers([]);
      setCurrentTeamId(null);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Load team members details (same logic as Team component)
  const loadTeamMembers = async (teamId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/team/${teamId}/members/detailed`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const members = await response.json();
        
        const formattedMembers = members.map((member, index) => {
          const simulatedStatus = getSimulatedStatus(member);
          
          return {
            userId: member.userId,
            name: member.username,
            email: member.email || `${member.username.toLowerCase().replace(/\s+/g, '.')}@company.com`,
            role: member.role || 'Team Member',
            image: member.image || '',
            status: simulatedStatus,
            tasksCompleted: member.tasks?.filter(t => t.status === 'Done')?.length || 0,
            totalTasks: member.tasks?.length || 0,
            lastActive: getLastActiveText(simulatedStatus),
            color: generateColor(member.username + index), // Add index to ensure different colors
            contactNumber: member.phone || 'N/A',
            teamId: teamId,
            tasks: member.tasks || []
          };
        });
        
        setTeamMembers(formattedMembers);
        setError(null);
      } else {
        console.warn('Failed to load members:', response.status);
        setTeamMembers([]);
        if (response.status === 401) {
          setError('Authentication failed. Please login again.');
        } else {
          setError('Failed to load team members.');
        }
      }
    } catch (error) {
      console.error('Error loading team members:', error);
      setTeamMembers([]);
      setError('Network error loading team members.');
    }
  };

  // Update member role
  const handleSaveRole = async () => {
    if (!currentTeamId || !selectedMember) {
      setError("Missing team or member information");
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE}/team/${currentTeamId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedMember.userId,
          role: newRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update role: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Role assignment response:", result);

      // Update local state
      setTeamMembers(prevMembers => 
        prevMembers.map(member => 
          member.userId === selectedMember.userId 
            ? { ...member, role: newRole }
            : member
        )
      );
      
      setError(null); // Clear any previous errors
      console.log("Successfully updated role via API");
      
    } catch (error) {
      console.error("Failed to update role:", error);
      if (error.message.includes('404')) {
        setError("User not found or not in this team. Please refresh and try again.");
      } else if (error.message.includes('400')) {
        setError("Invalid request. User may not be in this team.");
      } else if (error.message.includes('401')) {
        setError("Authentication failed. Please login again.");
      } else {
        setError(`Failed to update role: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
    
    setEditDialogOpen(false);
    setSelectedMember(null);
    setNewRole("");
  };

  const refreshTeamStatus = () => {
    if (currentTeamId) {
      loadTeamMembers(currentTeamId);
    } else {
      loadTeams();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
      case "online":
        return "success";
      case "busy":
        return "warning";
      case "offline":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
      case "online":
        return <CheckCircleIcon />;
      case "busy":
        return <ScheduleIcon />;
      case "offline":
        return <WarningIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
      case "online":
        return "Online";
      case "busy":
        return "Busy";
      case "offline":
        return "Offline";
      default:
        return "Unknown";
    }
  };

  const getProgressBarColor = (member) => {
    return member.color || "#9e9e9e";
  };

  const handleEditRole = (member) => {
    setSelectedMember(member);
    setNewRole(member.role);
    setEditDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setSelectedMember(null);
    setNewRole("");
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -280,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 280,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    const handleAvatarUpdate = (event) => {
      const { userId, avatarUrl, username } = event.detail;
      console.log('TeamStatus: Received avatar update for user:', userId, avatarUrl);
      
      setTeamMembers(prevMembers => 
        prevMembers.map(member => 
          member.userId === userId 
            ? { 
                ...member, 
                image: avatarUrl,
                name: username || member.name
              }
            : member
        )
      );
    };

    window.addEventListener('userAvatarUpdated', handleAvatarUpdate);
    
    return () => {
      window.removeEventListener('userAvatarUpdated', handleAvatarUpdate);
    };
  }, []);

  if (loading && teamMembers.length === 0) {
    return (
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#172b4d" }}>
            Team Status
          </Typography>
          <CircularProgress size={24} />
        </Box>
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#172b4d" }}>
            Team Status
          </Typography>
          <Typography variant="body2" sx={{ color: "#5e6c84" }}>
            {teamInfo ? `${teamInfo.teamName} - ${teamMembers.length} Team Members` : 'No team found'}
          </Typography>
        </Box>
        <IconButton 
          onClick={refreshTeamStatus} 
          size="small"
          disabled={loading}
          sx={{
            backgroundColor: "#f4f5f7",
            "&:hover": { backgroundColor: "#eeeeee" },
          }}
        >
          {loading ? <CircularProgress size={16} /> : <RefreshIcon />}
        </IconButton>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Team Member Cards - Horizontal Scrollable */}
      {teamMembers.length > 0 && (
        <Box sx={{ position: "relative" }}>
          {/* Left Scroll Button */}
          <IconButton
            onClick={scrollLeft}
            sx={{
              position: "absolute",
              left: -20,
              top: "50%",
              transform: "translateY(-50%)",
              backgroundColor: "#ffffff",
              border: "1px solid #e4e6ea",
              boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
              zIndex: 10,
              width: 40,
              height: 40,
              "&:hover": {
                backgroundColor: "#f8f9fa",
                transform: "translateY(-50%) scale(1.05)",
              },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>

          {/* Right Scroll Button */}
          <IconButton
            onClick={scrollRight}
            sx={{
              position: "absolute",
              right: -20,
              top: "50%",
              transform: "translateY(-50%)",
              backgroundColor: "#ffffff",
              border: "1px solid #e4e6ea",
              boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
              zIndex: 10,
              width: 40,
              height: 40,
              "&:hover": {
                backgroundColor: "#f8f9fa",
                transform: "translateY(-50%) scale(1.05)",
              },
            }}
          >
            <ChevronRightIcon />
          </IconButton>

          {/* Scrollable Container */}
          <Box
            ref={scrollContainerRef}
            sx={{
              display: "flex",
              gap: 3,
              overflowX: "auto",
              overflowY: "hidden",
              pb: 2,
              px: 2,
              "&::-webkit-scrollbar": {
                display: "none",
              },
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}
          >
            {teamMembers.map((member) => (
              <Card
                key={member.userId}
                sx={{
                  minWidth: 260,
                  maxWidth: 260,
                  height: 320,
                  backgroundColor: "#ffffff",
                  borderRadius: 3,
                  boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                  border: "1px solid #e4e6ea",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.15)",
                  },
                  flexShrink: 0,
                }}
              >
                <CardContent 
                  sx={{ 
                    p: 3,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Avatar + Name */}
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    {member.image ? (
                      // 显示用户上传的头像
                      <Avatar
                        src={member.image}
                        sx={{
                          width: 48,
                          height: 48,
                          mr: 2,
                        }}
                      />
                    ) : (
                      // 显示默认的彩色圆圈头像
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          mr: 2,
                          backgroundColor: member.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1rem",
                          fontWeight: 600,
                          color: "white",
                        }}
                      >
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          fontWeight: 600, 
                          color: "#172b4d",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "0.95rem",
                        }}
                      >
                        {member.name}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Role + Edit Button */}
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: "#5e6c84", 
                        fontWeight: 500,
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        pr: 1,
                        fontSize: "0.8rem",
                      }}
                    >
                      {member.role}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleEditRole(member)}
                      disabled={loading}
                      sx={{
                        backgroundColor: "#f4f5f7",
                        "&:hover": { backgroundColor: "#eeeeee" },
                        width: 26,
                        height: 26,
                        flexShrink: 0,
                      }}
                    >
                      <EditIcon sx={{ fontSize: "0.8rem" }} />
                    </IconButton>
                  </Box>

                  {/* Contact Number */}
                  <Box sx={{ mb: 1, textAlign: "center" }}>
                    <Typography variant="body2" sx={{ color: "#5e6c84", fontSize: "0.75rem", fontWeight: 500 }}>
                      📞 {member.contactNumber}
                    </Typography>
                  </Box>

                  {/* Task Progress */}
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" sx={{ color: "#5e6c84", fontSize: "0.8rem" }}>
                        Task Progress
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: "#172b4d",
                          fontWeight: 600,
                          fontSize: "0.8rem"
                        }}
                      >
                        {member.tasksCompleted}/{member.totalTasks}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={member.totalTasks > 0 ? (member.tasksCompleted / member.totalTasks) * 100 : 0}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "#e4e6ea",
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: getProgressBarColor(member),
                          borderRadius: 3,
                        },
                      }}
                    />
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: "#5e6c84",
                        display: "block",
                        mt: 1,
                        textAlign: "center",
                        fontSize: "0.7rem"
                      }}
                    >
                      {member.totalTasks > 0 ? Math.round((member.tasksCompleted / member.totalTasks) * 100) : 0}% complete
                    </Typography>
                  </Box>

                  {/* Last Active - Removed */}
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* Empty State */}
      {teamMembers.length === 0 && !loading && !error && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" sx={{ color: "#5e6c84" }}>
            {teamInfo ? 'No team members added yet' : 'No team found - Create a team first'}
          </Typography>
        </Box>
      )}

      {/* Edit Role Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit Role for {selectedMember?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              select
              fullWidth
              label="Role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              variant="outlined"
              helperText="Select a new role for this team member"
            >
              {availableRoles.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit" disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveRole} 
            variant="contained"
            disabled={!newRole || newRole === selectedMember?.role || loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamStatus;
