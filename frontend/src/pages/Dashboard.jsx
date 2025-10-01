import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Grid,
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Add, Refresh, SwapHoriz } from "@mui/icons-material";
import CalendarView from "../components/CalendarView";
import TeamStatus from "../components/TeamStatus";
import CreateTaskDialog from "../components/CreateTaskDialog";

const API_BASE = import.meta.env.VITE_API_URL;

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    summary: null,
    calendar: [],
    taskProgress: null,
    allTasks: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const { summary, calendar, taskProgress } = dashboardData;
  const token = localStorage.getItem("token");
  const teamId = localStorage.getItem("currentTeamId");
  const [members, setMembers] = useState([]);
  const decodeToken = (token) => {
    try {
      const base64 = token.split(".")[1];
      const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(json);
    } catch {
      return {};
    }
  };
  const {userId}=decodeToken(token);
  
  // Update states
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Task selection state
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [availableTasks, setAvailableTasks] = useState([]);
  
  // Refs for intervals
  const lastUpdateRef = useRef(null);

  // Get auth token
  const getAuthToken = () => localStorage.getItem('token');

  // Fetch dashboard summary from API
  const fetchSummary = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/dashboard/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - please login again');
        }
        throw new Error('Failed to fetch summary');
      }
      
      const data = await response.json();
      return {
        totalTasks: data.total,
        completedTasks: data.completed,
        taskStats: {
          completed: data.completed,
          inProgress: data.total - data.completed - data.remaining,
          pending: data.remaining
        }
      };
    } catch (error) {
      console.error('Error fetching summary:', error);
      throw error;
    }
  };

  // Fetch calendar events from API
  const fetchCalendar = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/dashboard/calendar`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - please login again');
        }
        throw new Error('Failed to fetch calendar');
      }
      
      const data = await response.json();
      return data.map(task => ({
        id: task.taskId,
        title: task.title,
        date: task.deadline,
        status: task.status,
        priority: task.status === 'Done' ? 'low' : task.status === 'In Progress' ? 'medium' : 'high'
      }));
    } catch (error) {
      console.error('Error fetching calendar:', error);
      throw error;
    }
  };

  // Fetch task progress by ID
  const fetchTaskProgress = async (taskId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/dashboard/task-progress/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch progress for task ${taskId}`);
      }
      
      const data = await response.json();
      return {
        taskId: data.taskId,
        title: data.title,
        status: data.status,
        progress: data.progress_percent
      };
    } catch (error) {
      console.error(`Error fetching task progress for ${taskId}:`, error);
      throw error;
    }
  };

  // Get all tasks for real-time monitoring
  const fetchAllTasks = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/task`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      return data.tasks || [];
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      return [];
    }
  };

  // Check for updates by comparing data (removed auto-refresh functionality)
  const checkForUpdates = useCallback(async () => {
    try {
      const tasks = await fetchAllTasks();
      
      // Create a simple hash to detect changes
      const currentDataHash = JSON.stringify({
        taskCount: tasks.length,
        statusCounts: tasks.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {}),
        lastModified: Math.max(...tasks.map(t => new Date(t.updatedAt || t.createdAt).getTime()))
      });
      
      lastUpdateRef.current = currentDataHash;
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }, []);

  // Load dashboard data from API
  const fetchDashboardData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    
    try {
      const [summaryData, calendarData, allTasks] = await Promise.all([
        fetchSummary(),
        fetchCalendar(),
        fetchAllTasks(),
      ]);

      // 设置可用任务列表
      const tasksForSelection = allTasks.map(task => ({
        id: task.taskId,
        title: task.title,
        status: task.status,
        deadline: task.deadline
      }));
      setAvailableTasks(tasksForSelection);

      let taskProgressData = null;
      let targetTaskId = selectedTaskId;
      
      // 如果没有选中的任务，自动选择一个
      if (!targetTaskId && tasksForSelection.length > 0) {
        // 优先选择 In Progress 的任务
        const inProgressTask = tasksForSelection.find(task => task.status === 'In Progress');
        targetTaskId = inProgressTask ? inProgressTask.id : tasksForSelection[0].id;
        setSelectedTaskId(targetTaskId);
      }
      
      // 获取选中任务的进度
      if (targetTaskId) {
        try {
          taskProgressData = await fetchTaskProgress(targetTaskId);
        } catch (taskError) {
          console.warn('Task progress not available for selected task');
        }
      }

      setDashboardData({
        summary: summaryData,
        calendar: calendarData,
        taskProgress: taskProgressData,
        allTasks: allTasks
      });
      
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data: ' + err.message);
      
      // Set empty data on error instead of mock data
      setDashboardData({
        summary: { totalTasks: 0, completedTasks: 0, taskStats: { completed: 0, inProgress: 0, pending: 0 } },
        calendar: [],
        taskProgress: null,
        allTasks: []
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTaskId]);

  // Handle task selection change
  const handleTaskSelectionChange = async (taskId) => {
    setSelectedTaskId(taskId);
    setRefreshing(true);
    
    try {
      const taskProgressData = await fetchTaskProgress(taskId);
      setDashboardData(prev => ({
        ...prev,
        taskProgress: taskProgressData
      }));
    } catch (error) {
      console.warn('Failed to fetch progress for selected task:', error);
      setDashboardData(prev => ({
        ...prev,
        taskProgress: null
      }));
    } finally {
      setRefreshing(false);
    }
  };

  // Get task status color
  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'Done':
        return '#4caf50';
      case 'In Progress':
        return '#ff9800';
      case 'To Do':
        return '#2196f3';
      default:
        return '#757575';
    }
  };

  // Manual refresh
  const handleManualRefresh = () => {
    fetchDashboardData(false);
  };
  const getMembers=async () =>{
    if (!teamId || teamId === "null" || !token){
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/user/${userId}/profile`, {
        method: "GET",
        headers: {
        'Authorization': `Bearer ${token}`,
        },
      });
        if (!res.ok) throw new Error("Failed to fetch self profile");
        const data = await res.json();
        console.log(data);
        setMembers([data.profile]);
      } catch (err) {
        console.error('fetch profile failed:', err);
      }
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/team/${teamId}/members/detailed`, {
      method: "GET",
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to fetch team members');
      }
      const data = await res.json();
      setMembers(data);
    } catch (err) {
      console.error('fetech failed:', err);
    }
  };
  useEffect(() => {
    getMembers();
  }, []);
  // Initial data load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleCreateTask = () => {
    setCreateTaskOpen(true);
  };

  const handleTaskCreated = (newTask) => {
    console.log('Task created:', newTask);
    // Refresh dashboard data after task creation
    fetchDashboardData(false);
  };

  // Format last updated time
  const formatLastUpdated = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor(diff / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ago`;
    } else if (seconds > 0) {
      return `${seconds}s ago`;
    } else {
      return 'Just now';
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          backgroundColor: "#f8f9fa",
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
        py: 3,
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "#172b4d",
                  mb: 1,
                  background: "linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Project Dashboard
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography
                  variant="body1"
                  sx={{ color: "#5e6c84", fontWeight: 400 }}
                >
                  Track your team's progress and stay on top of deadlines
                </Typography>
                {lastUpdated && (
                  <Chip
                    label={`Updated ${formatLastUpdated(lastUpdated)}`}
                    size="small"
                    color={refreshing ? "primary" : "default"}
                    sx={{ fontSize: "0.7rem" }}
                  />
                )}
              </Box>
            </Box>
            
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {/* Manual refresh button */}
              <IconButton
                onClick={handleManualRefresh}
                disabled={refreshing}
                sx={{
                  backgroundColor: "white",
                  border: "1px solid #e4e6ea",
                  "&:hover": {
                    backgroundColor: "#f8f9fa",
                  },
                }}
              >
                {refreshing ? (
                  <CircularProgress size={20} />
                ) : (
                  <Refresh fontSize="small" />
                )}
              </IconButton>
              
              {/* Create task button */}
              <Button
                variant="contained"
                startIcon={<Add />}
                sx={{
                  backgroundColor: "#1976d2",
                  color: "white",
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  textTransform: "none",
                  boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
                  "&:hover": {
                    backgroundColor: "#1565c0",
                    transform: "translateY(-1px)",
                    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.3)",
                  },
                  transition: "all 0.2s ease",
                }}
                onClick={handleCreateTask}
              >
                Create New Task
              </Button>
            </Box>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Box>

        <Grid container spacing={3}>
          {/* Progress Charts and Calendar Row */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, height: 500 }}>
              {/* Overall Task Progress */}
              <Card
                sx={{
                  flex: 1,
                  backgroundColor: "#ffffff",
                  borderRadius: 3,
                  boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                  border: "1px solid #e4e6ea",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.15)",
                  },
                }}
              >
                <CardContent
                  sx={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 2,
                    pt: 1.5,
                    position: "relative",
                  }}
                >
                  {refreshing && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        zIndex: 1,
                      }}
                    >
                      <CircularProgress size={16} />
                    </Box>
                  )}
                  
                  <Box
                    sx={{
                      width: 140,
                      height: 140,
                      borderRadius: "50%",
                      position: "relative",
                      background: summary && summary.totalTasks > 0
                        ? `conic-gradient(#FFA500 ${(summary.completedTasks / summary.totalTasks) * 360}deg, #e4e6ea 0deg)`
                        : `conic-gradient(#e4e6ea 360deg)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 3,
                    }}
                  >
                    <Box
                      sx={{
                        width: 110,
                        height: 110,
                        borderRadius: "50%",
                        backgroundColor: "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: 700,
                          color: "#FFA500",
                          lineHeight: 1,
                        }}
                      >
                        {summary && summary.totalTasks > 0
                          ? Math.round((summary.completedTasks / summary.totalTasks) * 100)
                          : 0}%
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: "#5e6c84",
                        mb: 1,
                      }}
                    >
                      Overall Progress
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: "#5e6c84",
                        mb: 0.5,
                        fontWeight: 500,
                      }}
                    >
                      {summary
                        ? `${summary.completedTasks} of ${summary.totalTasks} tasks`
                        : "No tasks available"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "#5e6c84" }}
                    >
                      {summary && summary.totalTasks > 0
                        ? `${summary.totalTasks - summary.completedTasks} tasks remaining`
                        : "Create your first task to get started"}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* Individual Task Progress */}
              {taskProgress ? (
                <Card
                  sx={{
                    flex: 1,
                    backgroundColor: "#ffffff",
                    borderRadius: 3,
                    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e4e6ea",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.15)",
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      p: 2,
                      pt: 1.5,
                      position: "relative",
                    }}
                  >
                    {refreshing && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          zIndex: 1,
                        }}
                      >
                        <CircularProgress size={16} />
                      </Box>
                    )}
                    
                    {/* Task Selector */}
                    <Box sx={{ mb: 2 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Select Task</InputLabel>
                        <Select
                          value={selectedTaskId || ''}
                          onChange={(e) => handleTaskSelectionChange(e.target.value)}
                          label="Select Task"
                          startAdornment={<SwapHoriz sx={{ mr: 1, color: "#5e6c84" }} />}
                        >
                          {availableTasks.map((task) => (
                            <MenuItem key={task.id} value={task.id}>
                              <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    backgroundColor: getTaskStatusColor(task.status),
                                    mr: 1,
                                  }}
                                />
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {task.title}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "#5e6c84" }}>
                                    {task.status} • {new Date(task.deadline).toLocaleDateString()}
                                  </Typography>
                                </Box>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    
                    {/* Progress Display */}
                    <Box sx={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      flex: 1 
                    }}>
                      <Box
                        sx={{
                          width: 120,
                          height: 120,
                          borderRadius: "50%",
                          position: "relative",
                          background: `conic-gradient(${getTaskStatusColor(taskProgress.status)} ${taskProgress.progress * 3.6}deg, #e4e6ea 0deg)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mr: 2,
                        }}
                      >
                        <Box
                          sx={{
                            width: 90,
                            height: 90,
                            borderRadius: "50%",
                            backgroundColor: "#ffffff",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography
                            variant="h4"
                            sx={{
                              fontWeight: 700,
                              color: getTaskStatusColor(taskProgress.status),
                              lineHeight: 1,
                            }}
                          >
                            {taskProgress.progress}%
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: "#172b4d",
                            mb: 1,
                            fontSize: "1rem",
                          }}
                        >
                          {taskProgress.title}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                          <Chip
                            label={taskProgress.status}
                            size="small"
                            sx={{
                              backgroundColor: getTaskStatusColor(taskProgress.status),
                              color: "white",
                              fontWeight: 500,
                              fontSize: "0.7rem",
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ) : availableTasks.length > 0 ? (
                <Card
                  sx={{
                    flex: 1,
                    backgroundColor: "#ffffff",
                    borderRadius: 3,
                    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e4e6ea",
                  }}
                >
                  <CardContent
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      p: 2,
                      pt: 1.5,
                    }}
                  >
                    {/* Task Selector */}
                    <Box sx={{ mb: 2 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Select Task</InputLabel>
                        <Select
                          value={selectedTaskId || ''}
                          onChange={(e) => handleTaskSelectionChange(e.target.value)}
                          label="Select Task"
                          startAdornment={<SwapHoriz sx={{ mr: 1, color: "#5e6c84" }} />}
                        >
                          {availableTasks.map((task) => (
                            <MenuItem key={task.id} value={task.id}>
                              <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    backgroundColor: getTaskStatusColor(task.status),
                                    mr: 1,
                                  }}
                                />
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {task.title}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "#5e6c84" }}>
                                    {task.status} • {new Date(task.deadline).toLocaleDateString()}
                                  </Typography>
                                </Box>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    
                    <Box sx={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      flex: 1,
                      flexDirection: "column" 
                    }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: "#5e6c84",
                          mb: 1,
                          textAlign: "center",
                        }}
                      >
                        Select a Task Above
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "#5e6c84", textAlign: "center" }}
                      >
                        Choose a task to view its progress
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ) : (
                <Card
                  sx={{
                    flex: 1,
                    backgroundColor: "#ffffff",
                    borderRadius: 3,
                    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e4e6ea",
                    opacity: 0.6,
                  }}
                >
                  <CardContent
                    sx={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      p: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: "#5e6c84",
                        mb: 1,
                        textAlign: "center",
                      }}
                    >
                      Individual Task Progress
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "#5e6c84", textAlign: "center" }}
                    >
                      No tasks available
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Card
              sx={{
                height: 500,
                backgroundColor: "#ffffff",
                borderRadius: 3,
                boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                border: "1px solid #e4e6ea",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.15)",
                },
                position: "relative",
              }}
            >
              {refreshing && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    zIndex: 1,
                  }}
                >
                  <CircularProgress size={20} />
                </Box>
              )}
              <CardContent sx={{ height: "100%", p: 3 }}>
                <CalendarView deadlines={calendar} />
              </CardContent>
            </Card>
          </Grid>

          {/* Team Status Row */}
          <Grid size={12}>
            <Box>
              <TeamStatus />
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        onTaskCreated={handleTaskCreated}
        members={members}
        user={userId}
      />
    </Box>
  );
};

export default Dashboard;