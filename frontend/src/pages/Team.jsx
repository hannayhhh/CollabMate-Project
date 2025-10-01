import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Menu,
  Tooltip,
  Alert,
  CircularProgress,
  FormHelperText,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
} from "@mui/material";
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Group as GroupIcon,
  PersonRemove as PersonRemoveIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Team = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDetailsDialogOpen, setEditDetailsDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [deleteTeamDialogOpen, setDeleteTeamDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [teamMenuAnchor, setTeamMenuAnchor] = useState(null);
  const [currentTeamId, setCurrentTeamId] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [operationInProgress, setOperationInProgress] = useState(false);
  
  const [allUsers, setAllUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  const [loadingStates, setLoadingStates] = useState({
    teams: false,
    members: false,
    addMember: false,
    updateRole: false,
    updateProfile: false,
    removeMember: false,
    createTeam: false,
    deleteTeam: false,
  });

  const [newMember, setNewMember] = useState({
    userId: "",
    name: "",
    email: "",
    role: "",
    contactNumber: "",
  });

  const [editMemberData, setEditMemberData] = useState({
    username: "",
    email: "",
    phone: "",
    role: "",
  });

  const [newTeam, setNewTeam] = useState({
    teamName: "",
    description: "",
  });

  // Available roles
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
  const getAuthToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  };

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

  // Get current user data
  const getCurrentUserData = () => {
    try {
      const savedUserData = localStorage.getItem('currentUserData');
      if (savedUserData) {
        return JSON.parse(savedUserData);
      }
    } catch (error) {
      console.warn('Failed to parse current user data:', error);
    }
    return null;
  };

  // Form validation
  const validateMemberForm = () => {
    const errors = {};
    
    if (!newMember.userId?.trim() && !newMember.name?.trim()) {
      errors.userId = 'User ID or Name is required';
    }
    
    if (!newMember.role) {
      errors.role = 'Role is required';
    }
    
    return errors;
  };

  const validateTeamForm = () => {
    const errors = {};
    
    if (!newTeam.teamName?.trim()) {
      errors.teamName = 'Team name is required';
    }
    
    return errors;
  };

  const validateEditForm = () => {
    const errors = {};
    
    if (!editMemberData.username?.trim()) {
      errors.username = 'Username is required';
    }
    
    if (editMemberData.email && !/\S+@\S+\.\S+/.test(editMemberData.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    return errors;
  };

  // Load all users from backend
  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = getAuthToken();
      
      if (!token) {
        setAllUsers([]);
        return;
      }

      const response = await fetch(`${API_BASE}/user/all`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const users = await response.json();
        setAllUsers(users || []);
        
        // Save current user data if available
        const currentUserId = getCurrentUserId();
        if (currentUserId) {
          const currentUser = users.find(user => user.userId === currentUserId);
          if (currentUser) {
            localStorage.setItem('currentUserData', JSON.stringify(currentUser));
          }
        }
      } else {
        console.warn('Failed to load users:', response.status);
        setAllUsers([]);
      }
    } catch (error) {
      console.error('Network error loading users:', error);
      setAllUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Filter users based on search query
  const filteredUsers = allUsers.filter(user => {
    if (!userSearchQuery) return true;
    return user.username?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
           user.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
           user.userId?.toLowerCase().includes(userSearchQuery.toLowerCase());
  });

  // Handle user selection
  const handleUserSelect = (user) => {
    setNewMember({
      ...newMember,
      userId: user.userId,
      name: user.username,
      email: user.email,
    });
    setUserSearchQuery(user.username);
    setShowUserDropdown(false);
  };

  // Handle search input focus
  const handleSearchFocus = () => {
    if (allUsers.length === 0) {
      loadAllUsers();
    }
    setShowUserDropdown(true);
  };

  // Handle clicking outside to close dropdown
  const handleSearchBlur = () => {
    setTimeout(() => {
      setShowUserDropdown(false);
    }, 200);
  };

  // Load teams and current user's team 
  const loadTeams = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn('No token available for loadTeams');
        return;
      }

      const savedTeamId = localStorage.getItem('currentTeamId');
      if (savedTeamId) {
        const teamExists = await loadTeamById(savedTeamId);
        if (teamExists) {
          return;
        }
      }

      setTeamInfo(null);
      setTeamMembers([]);
      setCurrentTeamId(null);
      localStorage.removeItem('currentTeamId');
      
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  // Load team by ID
  const loadTeamById = async (teamId) => {
    setLoadingStates(prev => ({ ...prev, teams: true }));
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn('No token available for loadTeamById');
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
        
        // Load team members immediately after team info is available
        await loadTeamMembers(teamId);
        return true;
      } else {
        console.warn(`Team ${teamId} not found or access denied:`, response.status);
        localStorage.removeItem('currentTeamId');
        setTeamInfo(null);
        setTeamMembers([]);
        setCurrentTeamId(null);
        return false;
      }
    } catch (error) {
      console.error('Error loading team:', error);
      localStorage.removeItem('currentTeamId');
      setTeamInfo(null);
      setTeamMembers([]);
      setCurrentTeamId(null);
      return false;
    } finally {
      setLoadingStates(prev => ({ ...prev, teams: false }));
    }
  };

  // Load team members details
  const loadTeamMembers = async (teamId) => {
    setLoadingStates((prev) => ({ ...prev, members: true }));

    try {
      const token = getAuthToken();
      
      if (!token) {
        console.warn('No token available for loadTeamMembers, but continuing...');
      }
      
      let currentTeamInfo = teamInfo;
      if (!currentTeamInfo || currentTeamInfo.teamId !== teamId) {
        try {
          const teamResponse = await fetch(`${API_BASE}/team/${teamId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          
          if (teamResponse.ok) {
            currentTeamInfo = await teamResponse.json();
            setTeamInfo(currentTeamInfo);
          }
        } catch (teamError) {
          console.error('Error loading team info:', teamError);
        }
      }
      
      const res = await fetch(
        `${API_BASE}/team/${teamId}/members/detailed`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (!res.ok) {
        if (res.status === 401) {
          console.warn('Unauthorized in loadTeamMembers, but not showing to user');
        } else if (res.status === 404) {
          console.warn('Team not found in loadTeamMembers');
        } else {
          console.warn(`Failed to load members: ${res.status} ${res.statusText}`);
        }
        return;
      }

      const members = await res.json();

      if (!Array.isArray(members)) {
        console.error('Invalid member data format');
        return;
      }

      if (members.length === 0) {
        setTeamMembers([]);
        return;
      }

      const formatted = members.map((m) => {
        const key = `member_added_${teamId}_${m.userId}`;
        const added = localStorage.getItem(key);
        let joinDate = m.joinDate || "Recently";

        if (added && !m.joinDate) {
          const addedDate = new Date(added);
          const now = new Date();
          const sameDay = addedDate.toDateString() === now.toDateString();

          if (sameDay) {
            const diffMs = now - addedDate;
            const minutes = Math.floor(diffMs / 60_000);
            const hours   = Math.floor(diffMs / 3_600_000);

            joinDate =
              hours === 0
                ? minutes < 5 ? "Just now"
                : `${minutes}m ago`
                : hours < 24
                ? `${hours}h ago`
                : "Today";
          } else {
            joinDate = addedDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
          }
        } else if (m.joinDate) {
          try {
            const joinDateObj = new Date(m.joinDate);
            joinDate = joinDateObj.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
          } catch (e) {
            joinDate = m.joinDate;
          }
        }

        return {
          userId:         m.userId,
          name:           m.username || 'Unknown User',
          email:          m.email  || "Not provided",
          contactNumber:  m.phone  || "Not provided",
          role:           m.role   || "No Role",
          image:          m.image  || "",
          tasks:          m.tasks  || [],
          tasksCompleted: m.tasks?.filter(t => t.status === "Done").length || 0,
          totalTasks:     m.tasks?.length || 0,
          color:          generateColor(m.username || 'Unknown'),
          joinDate,
          isStarred:      false,
          teamId,
          isAdministrator: currentTeamInfo?.administrator === m.userId,
        };
      });

      // Sort members: administrator first, then by name
      const sortedMembers = formatted.sort((a, b) => {
        if (a.isAdministrator && !b.isAdministrator) return -1;
        if (!a.isAdministrator && b.isAdministrator) return 1;
        return a.name.localeCompare(b.name);
      });

      setTeamMembers(sortedMembers);

    } catch (err) {
      console.error("Error loading team members:", err);
      
      if (teamMembers.length === 0) {
        setTeamMembers([]);
      }
    } finally {
      setLoadingStates((prev) => ({ ...prev, members: false }));
    }
  };

  // Generate consistent color for user
  const generateColor = (name) => {
    const colors = [
      "#6366f1", "#f59e0b", "#10b981", "#8b5cf6", 
      "#06b6d4", "#ec4899", "#f97316", "#84cc16"
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  // Filter members
  const filteredMembers = teamMembers ? teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         member.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) : [];

  // Create team
  const handleCreateTeam = async () => {
    const errors = validateTeamForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoadingStates(prev => ({ ...prev, createTeam: true }));
    try {
      const token = getAuthToken();
      const currentUserId = getCurrentUserId();
      
      if (!token) {
        console.warn('No token for team creation');
        return;
      }

      if (!currentUserId) {
        console.warn('Unable to determine current user');
        return;
      }

      const response = await fetch(`${API_BASE}/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          teamName: newTeam.teamName?.trim() || '',
          userId: currentUserId,
          description: newTeam.description?.trim() || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const createdTeam = result.team;
      
      setCurrentTeamId(createdTeam.teamId);
      setTeamInfo(createdTeam);
      localStorage.setItem('currentTeamId', createdTeam.teamId);
      
      // Track when the team creator was added
      const memberAddedKey = `member_added_${createdTeam.teamId}_${currentUserId}`;
      localStorage.setItem(memberAddedKey, new Date().toISOString());
      
      // Get current user info for immediate display
      let currentUser = allUsers.find(user => user.userId === currentUserId);
      
      if (!currentUser) {
        const savedUserData = localStorage.getItem('currentUserData');
        if (savedUserData) {
          try {
            currentUser = JSON.parse(savedUserData);
          } catch (e) {
            console.warn('Failed to parse saved user data');
          }
        }
        
        if (!currentUser) {
          currentUser = {
            userId: currentUserId,
            username: `User ${currentUserId}`,
            email: "Not provided",
            phone: "Not provided",
          };
        }
      }
      
      // Create initial team member entry for the creator/admin
      const creatorMember = {
        userId: currentUser.userId,
        name: currentUser.username,
        email: currentUser.email || "Not provided",
        contactNumber: currentUser.phone || "Not provided",
        role: "Team Administrator",
        tasks: [],
        tasksCompleted: 0,
        totalTasks: 0,
        color: generateColor(currentUser.username),
        joinDate: "Just now",
        isStarred: false,
        teamId: createdTeam.teamId,
        isAdministrator: true, 
      };
      
      // Set the creator as the first member immediately
      setTeamMembers([creatorMember]);
      
      // Then load complete team members data from backend
      setTimeout(async () => {
        await loadTeamMembers(createdTeam.teamId);
      }, 500);
      
      setCreateTeamDialogOpen(false);
      setNewTeam({ teamName: "", description: "" });
      setFormErrors({});
    } catch (error) {
      console.error('Create team error:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, createTeam: false }));
    }
  };

  // Delete team 
  const handleDeleteTeam = async () => {
    if (!currentTeamId) {
      setError("No team selected for deletion.");
      return;
    }

    setLoadingStates(prev => ({ ...prev, deleteTeam: true }));
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn('No token for delete team');
        return;
      }

      const response = await fetch(`${API_BASE}/team/${currentTeamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn('Failed to delete team:', response.status);
        return;
      }

      // Clear team state
      setCurrentTeamId(null);
      setTeamInfo(null);
      setTeamMembers([]);
      localStorage.removeItem('currentTeamId');
      
      setDeleteTeamDialogOpen(false);
      setTeamMenuAnchor(null);
      setError(null);
      
    } catch (error) {
      console.error("Failed to delete team:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, deleteTeam: false }));
    }
  };

  // Add member to team 
  const handleAddMember = async () => {
    const errors = validateMemberForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (!currentTeamId) {
      setError("Please create a team first before adding members.");
      return;
    }

    setLoadingStates(prev => ({ ...prev, addMember: true }));
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn('No token for add member');
        return;
      }

      // Add member to team
      const teamResponse = await fetch(`${API_BASE}/team/${currentTeamId}/member`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: newMember.userId
        }),
      });
      
      if (!teamResponse.ok) {
        console.warn('Failed to add member to team:', teamResponse.status);
        return;
      }

      // Assign role if provided
      if (newMember.role) {
        const roleResponse = await fetch(`${API_BASE}/team/${currentTeamId}/role`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: newMember.userId,
            role: newMember.role
          }),
        });

        if (!roleResponse.ok) {
          console.warn("Failed to assign role, but user was added to team");
        }
      }

      // Reload team members
      await loadTeamMembers(currentTeamId);

      // Track when this member was added
      const memberAddedKey = `member_added_${currentTeamId}_${newMember.userId}`;
      localStorage.setItem(memberAddedKey, new Date().toISOString());

      setOpenDialog(false);
      setNewMember({ userId: "", name: "", email: "", role: "", contactNumber: "" });
      setFormErrors({});
      setUserSearchQuery("");
      setShowUserDropdown(false);
      setAllUsers([]);
      
    } catch (error) {
      console.error('Add member error:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, addMember: false }));
    }
  };

  // Update member role
  const handleSaveRole = async () => {
    if (!currentTeamId || !selectedMember) {
      setError("Missing team or member information.");
      return;
    }

    if (!newRole || newRole.trim() === '') {
      setError("Please select a role.");
      return;
    }

    if (newRole === selectedMember.role) {
      handleCloseEditDialog();
      return;
    }

    const userExists = teamMembers.find(member => member.userId === selectedMember.userId);
    if (!userExists) {
      setError("User not found");
      return;
    }

    if (selectedMember.teamId && selectedMember.teamId !== currentTeamId) {
      setError("User not in this team");
      return;
    }

    setLoadingStates(prev => ({ ...prev, updateRole: true }));
    
    // Update local team member state immediately
    setTeamMembers(prevMembers => 
      prevMembers.map(member => 
        member.userId === selectedMember.userId 
          ? { 
              ...member, 
              role: newRole,
              isAdministrator: member.isAdministrator 
            }
          : member
      )
    );

    try {
      const token = getAuthToken();
      const currentUserId = getCurrentUserId();

      // Send role update request to backend
      const response = await fetch(`${API_BASE}/team/${currentTeamId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          userId: selectedMember.userId,
          role: newRole,
        }),
      });

      if (response.ok) {
        console.log('Role successfully updated in backend');
        
        // Check if updated member is current logged-in user, then sync with navbar
        if (selectedMember.userId === currentUserId) {
          console.log('Current user role updated, syncing with navbar...');
          
          // Use the same event system as Profile component
          const updateEvent = new CustomEvent('userProfileUpdated', {
            detail: {
              name: selectedMember.name,
              username: selectedMember.name,
              role: newRole,
              updatedBy: 'team_management'
            }
          });
          window.dispatchEvent(updateEvent);
          console.log('NavBar update event dispatched:', updateEvent.detail);
          
        } else {
          console.log('Role update was for different user, no navbar sync needed');
        }
        
      } else {
        console.warn('Backend role update failed:', response.status);
      }

    } catch (error) {
      console.warn('Failed to sync role update with backend:', error);
    }

    setLoadingStates(prev => ({ ...prev, updateRole: false }));
    handleCloseEditDialog();
    setError(null);
  };

  // Update member details 
  const handleSaveDetails = async () => {
    const errors = validateEditForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (!selectedMember) {
      setError("No member selected for editing.");
      return;
    }

    setLoadingStates(prev => ({ ...prev, updateProfile: true }));
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn('No token for update profile');
        return;
      }

      const response = await fetch(`${API_BASE}/user/${selectedMember.userId}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: editMemberData.username,
          email: editMemberData.email,
          phone: editMemberData.phone,
          role: editMemberData.role,
        }),
      });

      if (!response.ok) {
        console.warn('Failed to update profile:', response.status);
        return;
      }

      await loadTeamMembers(currentTeamId);
      
      setEditDetailsDialogOpen(false);
      setSelectedMember(null);
      setEditMemberData({ username: "", email: "", phone: "", role: "" });
      setFormErrors({});
      setError(null);
      
    } catch (error) {
      console.error("Failed to update member details:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, updateProfile: false }));
    }
  };

  // Remove member from team 
  const handleRemoveMember = async () => {
    if (!selectedMember || !currentTeamId) {
      setError("Missing member or team information.");
      return;
    }

    setLoadingStates(prev => ({ ...prev, removeMember: true }));
    
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn('No token for remove member');
        return;
      }

      const response = await fetch(`${API_BASE}/team/${currentTeamId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedMember.userId,
        }),
      });

      if (!response.ok) {
        console.warn('Failed to remove member:', response.status);
        return;
      }

      await loadTeamMembers(currentTeamId);

      const memberAddedKey = `member_added_${currentTeamId}_${selectedMember.userId}`;
      localStorage.removeItem(memberAddedKey);
      
      setRemoveDialogOpen(false);
      setSelectedMember(null);
      setAnchorEl(null);
      setError(null);
      
    } catch (error) {
      console.error("Error removing member:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, removeMember: false }));
    }
  };

  const handleEditRole = (member) => {
    const latestMemberInfo = teamMembers.find(m => m.userId === member.userId);
    
    if (!latestMemberInfo) {
      setError('Member not found. Please refresh the page.');
      return;
    }

    const memberToEdit = {
      ...latestMemberInfo,
      isAdministrator: teamInfo?.administrator === latestMemberInfo.userId
    };
    
    setSelectedMember(memberToEdit);
    setNewRole(latestMemberInfo.role);
    setAnchorEl(null);
    setError(null);
    
    setEditDialogOpen(true);
  };

  const handleEditDetails = (member) => {
    setSelectedMember(member);
    setEditMemberData({
      username: member.name,
      email: member.email === "Not provided" ? "" : member.email,
      phone: member.contactNumber === "Not provided" ? "" : member.contactNumber,
      role: member.role,
    });
    setEditDetailsDialogOpen(true);
    setAnchorEl(null);
  };

  const handleRemoveClick = (member) => {
    setSelectedMember(member);
    setRemoveDialogOpen(true);
    setAnchorEl(null);
  };

  const handleStarMember = (memberId) => {
    if (!teamMembers || teamMembers.length === 0) {
      return;
    }
    
    const updatedMembers = teamMembers.map(member =>
      member.userId === memberId
        ? { ...member, isStarred: !member.isStarred }
        : member
    );
    
    setTeamMembers(updatedMembers);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setNewRole("");
    setError(null);
    setSelectedMember(null);
  };

  const handleCloseDialog = (dialogSetter) => {
    dialogSetter(false);
    setFormErrors({});
    setNewMember({ userId: "", name: "", email: "", role: "", contactNumber: "" });
    setEditMemberData({ username: "", email: "", phone: "", role: "" });
    setUserSearchQuery("");
    setShowUserDropdown(false);
    setAllUsers([]);
  };

  useEffect(() => {
    (async () => {
      await loadAllUsers();
      await loadTeams();
    })();
  }, []);

  useEffect(() => {
    const handleAvatarUpdate = (event) => {
      const { userId, avatarUrl, username } = event.detail;
      console.log('Team: Received avatar update for user:', userId, avatarUrl);
      
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


  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#172b4d" }}>
            Team Management
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
            {teamInfo ? (
              <>
                <Typography variant="body1" sx={{ color: "#5e6c84" }}>
                  {teamInfo.teamName} - {teamMembers.length} members
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => setTeamMenuAnchor(e.currentTarget)}
                  sx={{ ml: 1 }}
                  aria-label="Team settings"
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </>
            ) : (
              <Typography variant="body1" sx={{ color: "#5e6c84" }}>
                No team created yet - Create a team to get started
              </Typography>
            )}
            {loadingStates.teams && (
              <CircularProgress size={16} />
            )}
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          {!teamInfo ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateTeamDialogOpen(true)}
              disabled={loadingStates.createTeam}
              sx={{
                backgroundColor: "#1976d2",
                borderRadius: 2,
                textTransform: "none",
                "&:hover": {
                  backgroundColor: "#1565c0",
                },
              }}
            >
              {loadingStates.createTeam ? <CircularProgress size={20} /> : "Create Team"}
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              disabled={loadingStates.addMember}
              sx={{
                backgroundColor: "#1976d2",
                borderRadius: 2,
                textTransform: "none",
                "&:hover": {
                  backgroundColor: "#1565c0",
                },
              }}
            >
              {loadingStates.addMember ? <CircularProgress size={20} /> : "Add Member"}
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }} 
          onClose={() => setError(null)}
          action={
            error.includes('expired') || error.includes('login') ? (
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('authToken');
                  window.location.href = '/login';
                }}
              >
                GO TO LOGIN
              </Button>
            ) : null
          }
        >
          {error}
        </Alert>
      )}

      {!teamInfo ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <Box sx={{ mb: 3 }}>
              <GroupIcon sx={{ fontSize: 80, color: "#e4e6ea" }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: "#172b4d" }}>
              Welcome to Team Management
            </Typography>
            <Typography variant="body1" sx={{ color: "#5e6c84", mb: 4, maxWidth: 400, mx: "auto" }}>
              Get started by creating your first team. You can then add team members, assign roles, and manage permissions.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateTeamDialogOpen(true)}
              disabled={loadingStates.createTeam}
              sx={{
                backgroundColor: "#1976d2",
                borderRadius: 2,
                textTransform: "none",
                py: 1.5,
                "&:hover": {
                  backgroundColor: "#1565c0",
                },
              }}
            >
              {loadingStates.createTeam ? <CircularProgress size={20} /> : "Create Your First Team"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, borderBottom: "1px solid #e4e6ea" }}>
              <Box sx={{ 
                display: "grid", 
                gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
                gap: 2,
                alignItems: "center"
              }}>
                <TextField
                  id="member-search"
                  name="memberSearch"
                  fullWidth
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: "#5e6c84", mr: 1 }} />,
                  }}
                  size="small"
                />
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ color: "#5e6c84", textAlign: "center" }}>
                    {filteredMembers.length} of {teamMembers.length} members
                  </Typography>
                </Box>
              </Box>
            </Box>

            {loadingStates.members ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Member</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Join Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.userId} hover>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Avatar
                              src={member.image}
                              sx={{
                                width: 40,
                                height: 40,
                                backgroundColor: member.color,
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                border: member.isAdministrator ? "2px solid #1976d2" : "none",
                              }}
                            >
                              {!member.image && member.name.split(" ").map((n) => n[0]).join("")}
                            </Avatar>
                            <Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {member.name}
                                </Typography>
                                {member.isAdministrator && (
                                  <Chip 
                                    label="Admin" 
                                    size="small" 
                                    color="primary"
                                    sx={{ 
                                      height: 20, 
                                      fontSize: "0.7rem",
                                      fontWeight: 600 
                                    }} 
                                  />
                                )}
                              </Box>
                              <Typography variant="caption" sx={{ color: "#5e6c84" }}>
                                ID: {member.userId}
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => handleStarMember(member.userId)}
                              aria-label={member.isStarred ? "Unstar member" : "Star member"}
                            >
                              {member.isStarred ? (
                                <StarIcon sx={{ color: "#ffc107", fontSize: "1rem" }} />
                              ) : (
                                <StarBorderIcon sx={{ fontSize: "1rem" }} />
                              )}
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {member.role}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: "#5e6c84" }}>
                            {member.email}
                          </Typography>
                          {member.contactNumber && member.contactNumber !== "Not provided" && (
                            <Typography variant="caption" sx={{ color: "#5e6c84", display: "block" }}>
                              Phone: {member.contactNumber}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: "#5e6c84" }}>
                            {member.joinDate}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <Tooltip title="Edit Details">
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditDetails(member)}
                                disabled={loadingStates.updateProfile}
                                aria-label="Edit member details"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="More Options">
                              <IconButton 
                                size="small"
                                onClick={(e) => {
                                  setAnchorEl(e.currentTarget);
                                  setSelectedMember(member);
                                }}
                                aria-label="More options"
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Member action menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => {
                setAnchorEl(null);
              }}
            >
              <MenuItem onClick={() => {
                handleEditRole(selectedMember);
              }}>
                <EditIcon sx={{ mr: 1, fontSize: "1rem" }} />
                Edit Role
              </MenuItem>
              {selectedMember && !selectedMember.isAdministrator && (
                <MenuItem 
                  onClick={() => handleRemoveClick(selectedMember)} 
                  sx={{ color: "error.main" }}
                >
                  <PersonRemoveIcon sx={{ mr: 1, fontSize: "1rem" }} />
                  Remove Member
                </MenuItem>
              )}
            </Menu>

            {/* Team settings menu */}
            <Menu
              anchorEl={teamMenuAnchor}
              open={Boolean(teamMenuAnchor)}
              onClose={() => setTeamMenuAnchor(null)}
            >
              <MenuItem 
                onClick={() => {
                  setDeleteTeamDialogOpen(true);
                  setTeamMenuAnchor(null);
                }} 
                sx={{ color: "error.main" }}
              >
                <DeleteIcon sx={{ mr: 1, fontSize: "1rem" }} />
                Delete Team
              </MenuItem>
            </Menu>
          </CardContent>
        </Card>
      )}

      {/* Create Team Dialog */}
      <Dialog open={createTeamDialogOpen} onClose={() => handleCloseDialog(setCreateTeamDialogOpen)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Team</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              id="team-name"
              name="teamName"
              label="Team Name"
              value={newTeam.teamName}
              onChange={(e) => setNewTeam(prev => ({ ...prev, teamName: e.target.value }))}
              fullWidth
              required
              placeholder="e.g., Development Team, Marketing Team"
              error={!!formErrors.teamName}
              helperText={formErrors.teamName}
            />
            <TextField
              id="team-description"
              name="description"
              label="Description"
              value={newTeam.description}
              onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              placeholder="Brief description of the team's purpose and goals"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCloseDialog(setCreateTeamDialogOpen)}>Cancel</Button>
          <Button 
            onClick={handleCreateTeam} 
            variant="contained"
            disabled={!newTeam.teamName.trim() || loadingStates.createTeam}
          >
            {loadingStates.createTeam ? <CircularProgress size={20} /> : "Create Team"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Team Dialog */}
      <Dialog open={deleteTeamDialogOpen} onClose={() => setDeleteTeamDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Team</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete <strong>{teamInfo?.teamName}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Warning:</strong> This action cannot be undone. All team data will be permanently deleted and all members will be removed from the team.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTeamDialogOpen(false)} color="inherit" disabled={loadingStates.deleteTeam}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteTeam} 
            variant="contained"
            color="error"
            disabled={loadingStates.deleteTeam}
            startIcon={loadingStates.deleteTeam ? <CircularProgress size={16} /> : null}
          >
            {loadingStates.deleteTeam ? "Deleting..." : "Delete Team"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={openDialog} onClose={() => handleCloseDialog(setOpenDialog)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Member</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <Box sx={{ position: "relative" }}>
              <TextField
                id="search-users"
                name="searchUsers"
                label="Search Users"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                fullWidth
                placeholder="Click to select user or type to search..."
                InputProps={{
                  endAdornment: loadingUsers && <CircularProgress size={20} />,
                }}
                helperText="Click to see all users, or type to filter by name/email"
              />
              
              {showUserDropdown && (
                <Paper 
                  sx={{ 
                    position: "absolute", 
                    top: "100%", 
                    left: 0, 
                    right: 0, 
                    zIndex: 1000,
                    maxHeight: 240,
                    overflow: "auto",
                    mt: 1,
                    boxShadow: 3
                  }}
                >
                  <List dense>
                    {filteredUsers.length > 0 ? (
                      <>
                        {filteredUsers.slice(0, 10).map((user) => (
                          <ListItem
                            key={user.userId}
                            onClick={() => handleUserSelect(user)}
                            sx={{ 
                              "&:hover": { backgroundColor: "#f5f5f5" },
                              py: 1,
                              cursor: "pointer"
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ width: 36, height: 36, fontSize: "0.9rem" }}>
                                {user.username?.charAt(0)?.toUpperCase()}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={user.username}
                              secondary={`${user.email || 'No email'} • ID: ${user.userId}`}
                              primaryTypographyProps={{ fontSize: "0.95rem", fontWeight: 500 }}
                              secondaryTypographyProps={{ fontSize: "0.8rem" }}
                            />
                          </ListItem>
                        ))}
                        {filteredUsers.length > 10 && (
                          <ListItem>
                            <ListItemText 
                              primary={`... and ${filteredUsers.length - 10} more users`}
                              secondary="Type to narrow down the search"
                              primaryTypographyProps={{ fontSize: "0.85rem", fontStyle: "italic", color: "text.secondary" }}
                              secondaryTypographyProps={{ fontSize: "0.75rem" }}
                            />
                          </ListItem>
                        )}
                      </>
                    ) : userSearchQuery ? (
                      <ListItem>
                        <ListItemText 
                          primary="No users found"
                          secondary="Please make sure the user has registered first"
                          primaryTypographyProps={{ fontStyle: "italic", color: "text.secondary" }}
                          secondaryTypographyProps={{ fontSize: "0.8rem" }}
                        />
                      </ListItem>
                    ) : loadingUsers ? (
                      <ListItem>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                          <CircularProgress size={20} />
                          <Typography variant="body2" color="text.secondary">
                            Loading users...
                          </Typography>
                        </Box>
                      </ListItem>
                    ) : (
                      <ListItem>
                        <ListItemText 
                          primary="No users found"
                          secondary="Check your connection or try again"
                          primaryTypographyProps={{ fontSize: "0.9rem", color: "text.secondary" }}
                          secondaryTypographyProps={{ fontSize: "0.8rem" }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              )}
            </Box>

            <TextField
              id="member-name"
              name="memberName"
              label="Name"
              value={newMember.name || userSearchQuery}
              onChange={(e) => {
                setNewMember({ ...newMember, name: e.target.value });
                setUserSearchQuery(e.target.value);
              }}
              fullWidth
              placeholder="Full name"
              helperText="Auto-filled when selecting existing user"
            />
            
            <TextField
              id="member-email"
              name="memberEmail"
              label="Email (Optional)"
              type="email"
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              fullWidth
              placeholder="user@example.com"
              helperText="Email address (optional)"
            />
            
            <TextField
              id="member-contact"
              name="memberContact"
              label="Contact Number (Optional)"
              value={newMember.contactNumber}
              onChange={(e) => setNewMember({ ...newMember, contactNumber: e.target.value })}
              fullWidth
              placeholder="+61 xxx xxx xxx"
            />

            <TextField
              id="member-userid"
              name="memberUserId"
              label="User ID"
              value={newMember.userId}
              onChange={(e) => setNewMember({ ...newMember, userId: e.target.value })}
              fullWidth
              required
              placeholder="Enter exact User ID"
              error={!!formErrors.userId}
              helperText={formErrors.userId || "Auto-filled when selecting existing user"}
            />
            
            <FormControl fullWidth required error={!!formErrors.role}>
              <InputLabel id="member-role-label">Role</InputLabel>
              <Select
                labelId="member-role-label"
                id="member-role"
                name="memberRole"
                value={newMember.role}
                label="Role"
                onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              >
                {availableRoles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.role && <FormHelperText>{formErrors.role}</FormHelperText>}
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCloseDialog(setOpenDialog)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddMember} 
            variant="contained"
            disabled={(!newMember.name?.trim() && !newMember.userId?.trim()) || !newMember.role || loadingStates.addMember}
          >
            {loadingStates.addMember ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Add Member"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleCloseEditDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit {selectedMember?.name}&apos;s Role
          {selectedMember?.isAdministrator && (
            <Chip 
              label="Admin" 
              size="small" 
              color="primary" 
              sx={{ ml: 1, height: 20, fontSize: "0.7rem" }} 
            />
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Current Role: <strong>{selectedMember?.role}</strong>
            </Typography>
            <TextField
              id="edit-role"
              name="editRole"
              select
              fullWidth
              label="New Role"
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
          <Button onClick={handleCloseEditDialog} color="inherit" disabled={loadingStates.updateRole}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveRole} 
            variant="contained"
            disabled={
              !newRole || 
              newRole === selectedMember?.role || 
              loadingStates.updateRole ||
              !newRole.trim()
            }
            startIcon={loadingStates.updateRole ? <CircularProgress size={16} /> : null}
          >
            {loadingStates.updateRole ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Details Dialog */}
      <Dialog 
        open={editDetailsDialogOpen} 
        onClose={() => setEditDetailsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit {selectedMember?.name}&apos;s Details
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              id="edit-username"
              name="editUsername"
              label="Username"
              value={editMemberData.username}
              onChange={(e) => setEditMemberData({ ...editMemberData, username: e.target.value })}
              fullWidth
              required
              error={!!formErrors.username}
              helperText={formErrors.username}
            />
            <TextField
              id="edit-email"
              name="editEmail"
              label="Email"
              type="email"
              value={editMemberData.email}
              onChange={(e) => setEditMemberData({ ...editMemberData, email: e.target.value })}
              fullWidth
              error={!!formErrors.email}
              helperText={formErrors.email}
            />
            <TextField
              id="edit-phone"
              name="editPhone"
              label="Phone"
              value={editMemberData.phone}
              onChange={(e) => setEditMemberData({ ...editMemberData, phone: e.target.value })}
              fullWidth
              placeholder="+61 xxx xxx xxx"
            />
            <TextField
              id="edit-details-role"
              name="editDetailsRole"
              select
              fullWidth
              label="Role"
              value={editMemberData.role}
              onChange={(e) => setEditMemberData({ ...editMemberData, role: e.target.value })}
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
          <Button onClick={() => setEditDetailsDialogOpen(false)} color="inherit" disabled={loadingStates.updateProfile}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveDetails} 
            variant="contained"
            disabled={!editMemberData.username?.trim() || loadingStates.updateProfile}
            startIcon={loadingStates.updateProfile ? <CircularProgress size={16} /> : null}
          >
            {loadingStates.updateProfile ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog 
        open={removeDialogOpen} 
        onClose={() => setRemoveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Remove {selectedMember?.name} from Team
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to remove <strong>{selectedMember?.name}</strong> from the team?
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Note:</strong> This will remove the member from this team and clear their team assignment.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveDialogOpen(false)} color="inherit" disabled={loadingStates.removeMember}>
            Cancel
          </Button>
          <Button 
            onClick={handleRemoveMember} 
            variant="contained"
            color="error"
            disabled={loadingStates.removeMember}
            startIcon={loadingStates.removeMember ? <CircularProgress size={16} /> : null}
          >
            {loadingStates.removeMember ? "Removing..." : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Team;