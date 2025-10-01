import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  IconButton,
  Grid,
  Chip,
  Tooltip,
  Badge,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

const API_BASE = import.meta.env.VITE_API_URL;

const CalendarView = ({ deadlines: propDeadlines }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [todayDate, setTodayDate] = useState(new Date());
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Update today's date every minute
  useEffect(() => {
    const updateToday = () => {
      setTodayDate(new Date());
    };

    updateToday();
    const interval = setInterval(updateToday, 60000);

    return () => clearInterval(interval);
  }, []);

  // Fetch calendar deadlines from API
  const fetchCalendarData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/dashboard/calendar`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - please login again');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const calendarData = await response.json();
      
      setDeadlines(calendarData);
      console.log("Successfully fetched calendar data:", calendarData);
    } catch (error) {
      console.error("Failed to fetch calendar data:", error);
      setError(error.message);
      setDeadlines([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount or when prop changes
  useEffect(() => {
    if (propDeadlines && propDeadlines.length > 0) {
      // Use deadlines passed as props
      const transformedDeadlines = propDeadlines.map(deadline => ({
        taskId: deadline.id || deadline.taskId,
        title: deadline.title,
        deadline: deadline.date || deadline.deadline,
        status: deadline.status || 'To Do',
        priority: deadline.priority || 'medium'
      }));
      setDeadlines(transformedDeadlines);
    } else {
      // Fetch from API
      fetchCalendarData();
    }
  }, [propDeadlines]);

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get calendar data
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Get previous month's last days to fill calendar
  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
  const prevMonthDays = [];
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    prevMonthDays.push(prevMonthLastDay - i);
  }

  // Calculate total days needed for 5 rows (35 cells)
  const totalCells = 35;
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Calculate next month days needed
  const usedCells = prevMonthDays.length + daysInMonth;
  const nextMonthDaysNeeded = Math.max(0, totalCells - usedCells);
  
  const nextMonthDays = [];
  for (let i = 1; i <= nextMonthDaysNeeded; i++) {
    nextMonthDays.push(i);
  }

  // Create complete calendar array
  const calendarDays = [
    ...prevMonthDays.map(day => ({ day, type: 'prev' })),
    ...currentMonthDays.map(day => ({ day, type: 'current' })),
    ...nextMonthDays.map(day => ({ day, type: 'next' }))
  ].slice(0, 35);

  // Get deadlines for specific date
  const getDeadlinesForDate = (date, month, year) => {
    return deadlines.filter((deadline) => {
      const deadlineDate = new Date(deadline.deadline);
      return (
        deadlineDate.getDate() === date &&
        deadlineDate.getMonth() === month &&
        deadlineDate.getFullYear() === year
      );
    });
  };

  // Check if date is today
  const isToday = (date, month, year) => {
    return (
      date === todayDate.getDate() &&
      month === todayDate.getMonth() &&
      year === todayDate.getFullYear()
    );
  };

  // Calculate days until deadline
  const getDaysUntilDeadline = (day, month, year) => {
    const deadlineDate = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    return `${diffDays} days left`;
  };

  // Get priority color based on status and priority
  const getPriorityColor = (status, priority) => {
    // Use status first for dynamic colors
    if (status === "Done") return "#4caf50";
    if (status === "In Progress") return "#ff9800";
    if (status === "To Do") return "#2196f3";
    
    // Fallback to priority colors
    switch (priority) {
      case "high":
        return "#f44336";
      case "medium":
        return "#ff9800";
      case "low":
        return "#9c27b0";
      default:
        return "#9e9e9e";
    }
  };

  // Get unique color for each deadline on same day
  const getDeadlineColor = (deadline, allDeadlinesForDay, index) => {
    const colors = [
      "#f44336", // Red
      "#ff9800", // Orange  
      "#4caf50", // Green
      "#2196f3", // Blue
      "#9c27b0", // Purple
      "#00bcd4", // Cyan
      "#ff5722", // Deep Orange
      "#795548", // Brown
    ];
    
    return colors[index % colors.length];
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const renderCalendarDay = (day, isCurrentMonth, month, year) => {
    const dayDeadlines = getDeadlinesForDate(day, month, year);
    const hasDeadlines = dayDeadlines.length > 0;
    const dayIsToday = isToday(day, month, year);

    return (
      <Box
        key={`${month}-${day}`}
        sx={{
          aspectRatio: "unset",
          height: 52,
          border: "1px solid",
          borderColor: "#e4e6ea",
          backgroundColor: isCurrentMonth ? "#ffffff" : "#f5f5f5",
          cursor: hasDeadlines ? "pointer" : "default",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            backgroundColor: isCurrentMonth ? "#e3f2fd" : "#eeeeee",
          },
          position: "relative",
          p: 0.25,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRadius: 1,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: isCurrentMonth ? "#172b4d" : "#bdbdbd",
            fontWeight: dayIsToday ? 700 : 400,
            fontSize: "0.85rem",
            mb: 0.5,
            lineHeight: 1,
          }}
        >
          {dayIsToday && (
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                borderRadius: "50%",
                backgroundColor: "#1976d2",
                color: "white",
                fontSize: "0.7rem",
                fontWeight: 700,
              }}
            >
              {day}
            </Box>
          )}
          {!dayIsToday && day}
        </Typography>

        {dayIsToday && (
          <Typography
            variant="caption"
            sx={{
              color: "#1976d2",
              fontWeight: 600,
              fontSize: "0.75rem",
              textAlign: "center",
              lineHeight: 1,
              mb: 0.5,
            }}
          >
            Today
          </Typography>
        )}

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.25 }}>
          {hasDeadlines && (
            <>
              {dayDeadlines.slice(0, 3).map((deadline, index) => (
                <Tooltip 
                  key={deadline.taskId}
                  title={
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'white', fontSize: '1rem' }}>
                        {deadline.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem' }}>
                        Status: {deadline.status} • {getDaysUntilDeadline(day, month, year)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                        Task ID: {deadline.taskId}
                      </Typography>
                    </Box>
                  }
                  arrow
                  placement="top"
                  componentsProps={{
                    tooltip: {
                      sx: {
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        fontSize: '0.875rem',
                        maxWidth: 220,
                        p: 2,
                      }
                    }
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: getDeadlineColor(deadline, dayDeadlines, index),
                      alignSelf: "center",
                      cursor: "pointer",
                      transition: "transform 0.2s ease",
                      mb: 0.25,
                      "&:hover": {
                        transform: "scale(1.3)",
                      }
                    }}
                  />
                </Tooltip>
              ))}
              {dayDeadlines.length > 3 && (
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.6rem",
                    color: "#5e6c84",
                    textAlign: "center",
                    lineHeight: 1,
                    fontWeight: 600,
                  }}
                >
                  +{dayDeadlines.length - 3}
                </Typography>
              )}
            </>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          px: 1,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: "#172b4d",
              fontSize: "1.25rem",
              lineHeight: 1.2,
            }}
          >
            Project Calendar {loading && "(Loading...)"}
          </Typography>
          <Typography
            variant="body2"
            sx={{ 
              color: "#5e6c84",
              fontSize: "0.875rem",
            }}
          >
            Deadlines and milestones ({deadlines.length} total)
          </Typography>
          {error && (
            <Typography
              variant="body2"
              sx={{ 
                color: "#f44336",
                fontSize: "0.75rem",
                mt: 0.5,
              }}
            >
              Error: {error}
            </Typography>
          )}
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton 
            onClick={fetchCalendarData} 
            size="small" 
            sx={{ p: 0.75 }}
            disabled={loading || !!propDeadlines}
          >
            <RefreshIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton onClick={goToToday} size="small" sx={{ p: 0.75 }}>
            <TodayIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton onClick={goToPreviousMonth} size="small" sx={{ p: 0.75 }}>
            <ChevronLeftIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Typography
            variant="h6"
            sx={{ 
              minWidth: 120, 
              textAlign: "center",
              fontSize: "1rem",
              fontWeight: 600,
            }}
          >
            {monthNames[currentMonth]} {currentYear}
          </Typography>
          <IconButton onClick={goToNextMonth} size="small" sx={{ p: 0.75 }}>
            <ChevronRightIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 0.5,
            mb: 2,
          }}
        >
          {dayNames.map((dayName) => (
            <Box key={dayName} sx={{ textAlign: "center" }}>
              <Typography
                variant="subtitle2"
                sx={{ 
                  fontWeight: 600, 
                  color: "#5e6c84",
                  fontSize: "0.875rem",
                }}
              >
                {dayName.slice(0, 3)}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gridTemplateRows: "repeat(5, 55px)",
            gap: 1,
            height: 295,
            width: "100%",
            my: 2,
          }}
        >
          {calendarDays.map((dayObj, index) => {
            const { day, type } = dayObj;
            const isCurrentMonth = type === 'current';
            
            const month = type === 'prev' 
              ? (currentMonth - 1 < 0 ? 11 : currentMonth - 1)
              : type === 'current' 
              ? currentMonth
              : (currentMonth + 1 > 11 ? 0 : currentMonth + 1);
              
            const year = type === 'prev' && currentMonth === 0
              ? currentYear - 1
              : type === 'next' && currentMonth === 11
              ? currentYear + 1
              : currentYear;

            return renderCalendarDay(day, isCurrentMonth, month, year);
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default CalendarView;