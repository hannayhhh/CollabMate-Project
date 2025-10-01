import React from "react";
import { Paper, Typography, CircularProgress, Box } from "@mui/material";

function TaskProgressChart({ progress }) {
  return (
    <Paper
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Task 1 Progress
      </Typography>
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <CircularProgress variant="determinate" value={progress} size={100} />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: "absolute",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="h6" component="div">
            {`${Math.round(progress)}%`}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

export default TaskProgressChart;
