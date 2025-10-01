// components/Dashboard/TaskSummaryCard.jsx
import { Card, CardContent, Typography } from "@mui/material";

export default function TaskSummaryCard() {
  const completed = 6;
  const total = 10;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Total Tasks</Typography>
        <Typography variant="body1">Completed: {completed}</Typography>
        <Typography variant="body1">Remaining: {total - completed}</Typography>
      </CardContent>
    </Card>
  );
}
