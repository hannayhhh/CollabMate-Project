import React, { useState, useEffect } from "react";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Badge,
  useMediaQuery,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Group as GroupIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Task as TaskIcon,
  Folder as ProjectIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
} from "@mui/icons-material";
import LaunchOutlinedIcon from '@mui/icons-material/LaunchOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";

const drawerWidth = 280;
const API_BASE = import.meta.env.VITE_API_URL;

// Decode JWT payload without extra libs
const decodeToken = (token) => {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return {};
  }
};

const DashboardNavBar = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [userInfo, setUserInfo] = useState({
    name: "",
    role: "",
    avatarUrl: "",
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width:900px)");

  // Fetch user info and task count on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };
    const tokenData = decodeToken(token);

    // Fetch task count for badge
    fetch(`${API_BASE}/task`, { headers })
      .then((r) => {
        if (r.ok) {
          return r.json();
        } else if (r.status === 404) {
          console.warn('Tasks endpoint not available yet');
          return { task: [] };
        } else {
          return Promise.reject();
        }
      })
      .then((d) => setTaskCount(d.task?.length || 0))
      .catch(() => {
        console.warn('Failed to load tasks, setting count to 0');
        setTaskCount(0);
      });

    // Fetch user profile
    const { userId } = tokenData;
    if (userId) {
      fetch(`${API_BASE}/user/${userId}/profile`, { headers })
        .then((r) => {
          if (r.ok) {
            return r.json();
          } else {
            throw new Error('Profile not available');
          }
        })
        .then((d) => {
          const p = d.profile || {};
          setUserInfo({
            name: p.username || p.fullName || tokenData.username || tokenData.name || "User",
            role: p.role || tokenData.role || "Member",
            avatarUrl: p.image || "",
          });
        })
        .catch(() => {
          // Use token data as fallback
          setUserInfo({
            name: tokenData.username || tokenData.name || "User",
            role: tokenData.role || "Member",
            avatarUrl: "",
          });
        });
    } else {
      // Fallback if no userId in token
      setUserInfo({
        name: tokenData.username || tokenData.name || "User",
        role: tokenData.role || "Member",
        avatarUrl: "",
      });
    }
  }, []);

  // 监听来自 Profile 和 Team 组件的用户信息更新事件
  useEffect(() => {
    const handleUserProfileUpdate = (event) => {
      const updates = event.detail;
      console.log('NavBar: Received userProfileUpdated event:', updates);
      
      setUserInfo(current => {
        const updated = {
          ...current,
          name: updates.name || updates.username || current.name,
          role: updates.role || current.role,
          avatarUrl: updates.avatarUrl || current.avatarUrl
        };
        console.log('NavBar: Updated user info from', current, 'to', updated);
        return updated;
      });
    };

    // 添加事件监听器
    window.addEventListener('userProfileUpdated', handleUserProfileUpdate);
    console.log('NavBar: Event listener added for userProfileUpdated');

    // 清理函数
    return () => {
      window.removeEventListener('userProfileUpdated', handleUserProfileUpdate);
      console.log('NavBar: Event listener removed for userProfileUpdated');
    };
  }, []); // 空依赖数组确保只设置一次

  // Separate useEffect for global function to avoid closure issues
  useEffect(() => {
    // Create stable update function using latest setUserInfo
    window.updateNavBarUserInfo = (updates) => {
      console.log('NavBar: Updating user info with:', updates);
      setUserInfo(current => {
        const updated = { ...current, ...updates };
        console.log('NavBar: Updated from', current, 'to', updated);
        return updated;
      });
    };

    console.log('NavBar: Global function exposed');

    return () => {
      console.log('NavBar: Cleaning up global function');
      delete window.updateNavBarUserInfo;
    };
  }, []); // Empty dependency to ensure it only runs once

  // Search function that queries backend
  const performSearch = async (query) => {
    try {
      setSearchLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      // Search tasks and teams in parallel
      const [tasksResponse, teamsResponse] = await Promise.all([
        fetch(`${API_BASE}/task`, { headers }),
        fetch(`${API_BASE}/team`, { headers })
      ]);

      const results = [];
      
      // Process tasks
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        const filteredTasks = (tasksData.tasks || []).filter(task =>
          task.title.toLowerCase().includes(query.toLowerCase()) ||
          task.description.toLowerCase().includes(query.toLowerCase())
        );
        
        filteredTasks.forEach(task => {
          results.push({
            id: task.taskId,
            type: "task",
            title: task.title,
            description: task.description,
            status: task.status
          });
        });
      }

      // Process teams
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        const filteredTeams = (teamsData.teams || []).filter(team =>
          team.teamName.toLowerCase().includes(query.toLowerCase())
        );
        
        filteredTeams.forEach(team => {
          results.push({
            id: team.teamId,
            type: "team",
            title: team.teamName,
            description: `Team with ${team.members?.length || 0} members`,
            memberCount: team.members?.length || 0
          });
        });
      }

      return results;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    } finally {
      setSearchLoading(false);
    }
  };

  const menuItems = [
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/dashboard",
      badge: null,
      description: "Overview & analytics",
    },
    {
      text: "Team",
      icon: <GroupIcon />,
      path: "/team",
      badge: null,
      description: "Team collaboration",
    },
    {
      text: "Task",
      icon: <AssignmentIcon />,
      path: "/tasks",
      badge: taskCount > 0 ? taskCount.toString() : null,
      description: "Manage your tasks",
    },
    {
      text: "GitLab",
      icon: <RocketLaunchIcon />,
      path: "/gitlab",
      badge: null,
      description: "GitLab Integration"
    }
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const handleSearchClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleSearchChange = async (event) => {
    const query = event.target.value;
    setSearchQuery(query);

    if (query.trim() === "") {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Debounce search to avoid too many API calls
    if (query.length >= 2) {
      const results = await performSearch(query);
      setSearchResults(results);
      setShowSearchResults(true);
    }
  };

  const handleSearchFocus = () => {
    if (searchQuery && searchResults.length > 0) {
      setShowSearchResults(true);
    }
  };

  const handleSearchBlur = () => {
    // Delay hiding results to allow clicking
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
  };

  const handleSearchItemClick = (item) => {
    // Navigate based on item type and backend structure
    switch (item.type) {
      case "task":
        navigate(`/tasks/${item.id}`);
        break;
      case "team":
        navigate(`/team/${item.id}`);
        break;
      case "people":
        navigate(`/team/member/${item.id}`);
        break;
      default:
        break;
    }
    handleSearchClose();
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "task":
        return "#ff9800";
      case "team":
        return "#4caf50";
      case "people":
        return "#9c27b0";
      default:
        return "#9e9e9e";
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "task":
        return "Task";
      case "team":
        return "Team";
      case "people":
        return "Person";
      default:
        return "Unknown";
    }
  };

  const getTaskStatusColor = (status) => {
    switch (status) {
      case "Done":
        return "#4caf50";
      case "In Progress":
        return "#ff9800";
      case "To Do":
        return "#2196f3";
      default:
        return "#9e9e9e";
    }
  };

  // Generate user initials
  const getUserInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0]?.toUpperCase())
      .join("");
  };

  const handleProfileMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    navigate("/profile");
    handleProfileMenuClose();
  };

  const handleLogout = () => {
    // Clear all stored data
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentTeamId");
    
    // Clear any team member tracking data
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('member_added_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Redirect to login page
    navigate("/login");
    handleProfileMenuClose();
  };

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        backgroundColor: "#f8f9fa",
        color: "#172b4d",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Logo & Brand */}
      <Box
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          gap: 2,
          borderBottom: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: 2,
            backgroundImage: `url(${logo})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.2rem" }}>
            CollabMate
          </Typography>
          <Typography variant="caption" sx={{ color: "#5e6c84" }}>
            Workspace
          </Typography>
        </Box>
      </Box>

      {/* User Profile */}
      <Box
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          gap: 2,
          borderBottom: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <Avatar
          src={userInfo.avatarUrl}
          alt={userInfo.name}
          sx={{
            width: 44,
            height: 44,
            background: "linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)",
            cursor: "pointer",
            fontSize: "1.1rem",
            fontWeight: 600,
            color: "white",
          }}
        >
          {getUserInitials(userInfo.name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "1rem" }}>
            {userInfo.name || "Loading..."}
          </Typography>
          <Typography variant="caption" sx={{ color: "#5e6c84", fontSize: "0.85rem" }}>
            {userInfo.role || "Member"}
          </Typography>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ flex: 1, py: 2 }}>
        <List sx={{ px: 2 }}>
          {menuItems.map((item) => (
            <ListItem
              key={item.text}
              onClick={() => navigate(item.path)}
              sx={{
                mb: 1,
                borderRadius: 2,
                cursor: "pointer",
                backgroundColor: isActivePath(item.path)
                  ? "#bbdefb"
                  : "transparent",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "#eeeeee",
                  transform: "translateX(4px)",
                },
                "&:active": {
                  transform: "translateX(2px)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActivePath(item.path) 
                    ? "#1976d2"
                    : "#5e6c84",
                  minWidth: 40,
                }}
              >
                {item.badge ? (
                  <Badge
                    badgeContent={item.badge}
                    color="error"
                    sx={{
                      "& .MuiBadge-badge": {
                        backgroundColor: "#f44336",
                        color: "white",
                        fontSize: "0.7rem",
                        minWidth: 18,
                        height: 18,
                      },
                    }}
                  >
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                secondary={item.description}
                primaryTypographyProps={{
                  sx: {
                    fontWeight: isActivePath(item.path) ? 600 : 400,
                    fontSize: "0.9rem",
                    color: isActivePath(item.path) 
                      ? "#1976d2"
                      : "#172b4d",
                  },
                }}
                secondaryTypographyProps={{
                  sx: {
                    color: "#5e6c84",
                    fontSize: "0.75rem",
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Logout Button */}
      <Box sx={{ p: 3, borderTop: "1px solid rgba(0,0,0,0.1)" }}>
        <Button
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            backgroundColor: "#e57373",
            color: "white",
            borderRadius: 2,
            py: 1.5,
            fontWeight: 600,
            textTransform: "none",
            "&:hover": {
              backgroundColor: "#d32f2f",
              transform: "translateY(-1px)",
            },
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)",
          borderRadius: 1,
          boxShadow: "0px 1px 1px rgba(0, 0, 0, 0.12)",
          border: "1px solid #e4e6ea",
          color: "#172b4d",
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Search Bar */}
          <Box
            sx={{
              position: "relative",
              flex: 1,
              maxWidth: 400,
              borderRadius: 6,
            }}
          >
            <TextField
              fullWidth
              placeholder="Search tasks, teams, and people..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {searchLoading ? (
                      <CircularProgress size={16} sx={{ color: "#5e6c84" }} />
                    ) : (
                      <SearchIcon sx={{ color: "#5e6c84", fontSize: 20 }} />
                    )}
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleSearchClose}
                      sx={{ mr: -1 }}
                    >
                      <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#f4f5f7",
                  borderRadius: 3,
                  "& fieldset": {
                    border: "none",
                  },
                  "&:hover": {
                    backgroundColor: "#eeeeee",
                  },
                  "&.Mui-focused": {
                    backgroundColor: "#ffffff",
                    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                  },
                },
              }}
            />

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <Box
                sx={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  backgroundColor: "#ffffff",
                  borderRadius: 2,
                  boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.15)",
                  border: "1px solid #e4e6ea",
                  mt: 1,
                  maxHeight: 400,
                  overflowY: "auto",
                  zIndex: 1300,
                }}
              >
                {searchResults.length > 0 ? (
                  <>
                    <Box sx={{ p: 2, borderBottom: "1px solid #e4e6ea" }}>
                      <Typography variant="caption" sx={{ color: "#5e6c84" }}>
                        Found {searchResults.length} results
                      </Typography>
                    </Box>
                    {searchResults.map((item) => (
                      <Box
                        key={item.id}
                        onMouseDown={() => handleSearchItemClick(item)}
                        sx={{
                          p: 2,
                          cursor: "pointer",
                          borderBottom: "1px solid #f4f5f7",
                          "&:hover": {
                            backgroundColor: "#f8f9fa",
                          },
                          "&:last-child": {
                            borderBottom: "none",
                          },
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                          <Box
                            sx={{
                              color: getTypeColor(item.type),
                              mr: 1,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            {item.type === "task" ? <TaskIcon /> : 
                             item.type === "team" ? <GroupIcon /> : 
                             <PersonIcon />}
                          </Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                            {item.title}
                          </Typography>
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            {item.status && (
                              <Chip
                                label={item.status}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "0.65rem",
                                  backgroundColor: getTaskStatusColor(item.status),
                                  color: "white",
                                }}
                              />
                            )}
                            <Chip
                              label={getTypeLabel(item.type)}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: "0.65rem",
                                backgroundColor: getTypeColor(item.type),
                                color: "white",
                              }}
                            />
                          </Box>
                        </Box>
                        <Typography variant="body2" sx={{ color: "#5e6c84", ml: 3 }}>
                          {item.description}
                          {item.memberCount && ` • ${item.memberCount} members`}
                        </Typography>
                      </Box>
                    ))}
                  </>
                ) : (
                  <Box sx={{ p: 3, textAlign: "center" }}>
                    <Typography variant="body2" sx={{ color: "#5e6c84" }}>
                      No results found for "{searchQuery}"
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Header Actions */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar
              src={userInfo.avatarUrl}
              alt={userInfo.name}
              sx={{
                width: 36,
                height: 36,
                ml: 1,
                background: "linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "white",
              }}
              onClick={handleProfileMenuClick}
            >
              {getUserInitials(userInfo.name)}
            </Avatar>
            
            {/* Profile Menu */}
            <Menu
              id="profile-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleProfileMenuClose}
              onClick={handleProfileMenuClose}
              disableAutoFocus
              disableEnforceFocus
              PaperProps={{
                elevation: 3,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
                  mt: 1.5,
                  minWidth: 180,
                  '& .MuiAvatar-root': {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={handleProfileClick}>
                <AccountCircleIcon sx={{ mr: 2, fontSize: 20 }} />
                Profile
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: '#e57373' }}>
                <LogoutIcon sx={{ mr: 2, fontSize: 20 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              border: "none",
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              border: "none",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: "#fafafa",
          minHeight: "100vh",
          overflow: "auto",
        }}
      >
        <Toolbar />
        <Box sx={{ p: 0 }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default DashboardNavBar;
