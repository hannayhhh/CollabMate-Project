import {Container,Box,Typography,Card,CardContent,Select, MenuItem,Grid,Alert,Snackbar} from "@mui/material";
import Button from '@mui/material/Button';
import AddIcon from "@mui/icons-material/Add";
import {useState,useEffect, useId} from 'react';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import UpdateIcon from "@mui/icons-material/Update";
import CreateTaskDialog from "../components/CreateTaskDialog";
import TaskCard from "../components/TaskCard";
import OutlinedInput from '@mui/material/OutlinedInput';
import FirstIcon from "../assets/icon1.png";
import SecondIcon from "../assets/icon2.png";
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import ArrowCircleRightOutlinedIcon from '@mui/icons-material/ArrowCircleRightOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import {DragDropContext,Droppable,Draggable} from '@hello-pangea/dnd';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ReplyAllOutlinedIcon from '@mui/icons-material/ReplyAllOutlined';
import GitLabDialog from "../components/GitLabDialog";
function Tasks() {
  const [showForm, setShowForm] = useState(false);
  const [taskList,setTaskList]=useState([]);
  const [group,setGroup]=useState("created");
  const token = localStorage.getItem("token");
  const teamId = localStorage.getItem("currentTeamId");
  const [gitlabDialogOpen, setGitlabDialogOpen] = useState(false);
  const isConnected=localStorage.getItem("GitLab")!==null;
  const [snackOpen, setSnackOpen] = useState(false);
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
  const [members, setMembers] = useState([]);
  const fetchTasks = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/task`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
      const data = await res.json();
      setTaskList(data.tasks || []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    }
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
    fetchTasks();
    getMembers();
  }, []);
  const handleUpdate=async(taskId, newStatus)=>{
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/task/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });
      if (!res.ok) throw new Error("Failed to update task");
    } catch (err) {
      console.error("Update error:", err);
    }
  }
  const handleTaskDeleted = (deletedId) => {
    fetchTasks();
  };
  const handleTaskUpdated = (updatedTask) => {
    fetchTasks();
  };
  const handleDragEnd = (result) => {
    if (!result.destination){
      return;
    }else{
      console.log(result.draggableId);
      console.log(result.destination.droppableId);
      setTaskList((prev)=>{
        return prev.map((item)=>{
          if (item.taskId==result.draggableId){
            const newTask={ ...item, status: result.destination.droppableId };
            return newTask;
          }else{
            return item
          }
        })
      });
      handleUpdate(result.draggableId,result.destination.droppableId);
    }
  };
  const filterTasks= (oneTask) => {
    if (group==="created"){
      return oneTask.creator === userId;
    }
    if (group==="individual"){
      return oneTask.userIds?.includes(userId);
    }
    if (group==="team"){
      if(teamId){
        const assigneeIsMem= oneTask.userIds?.some(uid => members.some(member => member.userId === uid));
        if(assigneeIsMem) {
          return true;
        }else{
          return members.some(member => member.userId === oneTask.creator);
        }
      }
    }
    return false;
  }
  const handleGitlabImport = (selectedIssueId) => {
    fetchTasks();
  };
  return (
    <Box
      sx={{
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
        py: 3,
      }}
    >
      <Container maxWidth="xl">
        <Box sx={{ mb: 4}}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 1,
              display: "inline-block",
              background: "linear-gradient(to right, #1976d2, #9c27b0)",
              backgroundSize: "130%",
              backgroundPosition: "left",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Task Management
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: "#5e6c84", fontWeight: 400 }}
          >
            Create and manage your team's tasks. Update progress and stay organized.
          </Typography>
        </Box>
        <Box display="flex" gap={6} ml={12}>
          <Card sx={{
            width: 330,
            height: 250,
            backgroundColor: "#ffffff",
            borderRadius: 4,
            boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e4e6ea",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 3,
            overflow: "hidden"}}
          > 
            <img src={FirstIcon} alt="Create Task Icon" style={{ width: '80px' }} />
            <Typography gutterBottom variant="h5" component="div" sx={{fontWeight: 900}} >Create Task</Typography>
            <Typography
              variant="body1"
              sx={{ 
                color: "#5e6c84", 
                fontWeight: 400, 
                width:250,
                paddingLeft: '1em',
                textIndent: '-1em'
              }}
            >
              Create a new task. It will be added to your To-Do list Automatically.
            </Typography>
            <Button variant="contained" sx={{ 
              textTransform: "none",
              fontSize: "1rem",
              borderRadius: 2,
              marginTop: 1.6,
              width: 272}}
              startIcon={<AddIcon />}
              onClick={() => {
                setShowForm((prev) => !prev);
              }}>
              Create new task
            </Button>
            {showForm && (
              <CreateTaskDialog
                open={showForm}
                onClose={() => setShowForm(false)}
                onTaskCreated={() => {
                  fetchTasks();
                  setShowForm(false);
                }}
                members={members}
                user={userId}
              />
            )}
          </Card>
          <Card sx={{
            width: 330,
            height: 250,
            backgroundColor: "#ffffff",
            borderRadius: 4,
            boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e4e6ea",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 3,
            overflow: "hidden"}}
          > 
            <img src={SecondIcon} alt="Update Status Icon" style={{ width: '80px' }} />
            <Typography gutterBottom variant="h5" component="div" sx={{fontWeight: 900}} >Task View</Typography>
            <Typography
              variant="body1"
              sx={{ 
                color: "#5e6c84", 
                fontWeight: 400, 
                width: 250,
                paddingLeft: "2.5em",
                textIndent: "-1.6em"
              }}
            >
              {group === "team"
                ? "You are currently viewing all tasks that belong to your team."
                : group === "individual"
                ? "You are currently viewing only the tasks assigned to you."
                : "You are currently viewing the tasks you created."}
            </Typography>
            <ToggleButtonGroup
              color="primary"
              exclusive
              aria-label="Platform"
              value={group}
              onChange={(e)=>{
                setGroup(e.target.value);
              }}
              sx={{
                marginTop: 1.5,
                height: 40
              }}
            > 
              <ToggleButton value="created" sx={{
                borderRadius: 2,
                textTransform: "none",
                width: 95,
                color: "#1976d2",
                fontSize: "1rem",
                fontWeight: 500,
                '&.Mui-selected': {
                  backgroundColor: "#1976d2",
                  color: "#ffffff"
                }
              }}>
                Created
              </ToggleButton>
              <ToggleButton value="individual" sx={{
                borderRadius: 2,
                textTransform: "none",
                width: 95,
                color: "#1976d2",
                fontSize: "1rem",
                fontWeight: 500,
                '&.Mui-selected': {
                  backgroundColor: "#1976d2",
                  color: "#ffffff"
                }
              }}>
                My Tasks
              </ToggleButton>
              <ToggleButton value="team" sx={{
                borderRadius: 2,
                textTransform: "none",
                width: 95,
                color: "#1976d2",
                fontSize: "1rem",
                fontWeight: 500,
                '&.Mui-selected': {
                  backgroundColor: "#1976d2",
                  color: "#ffffff"
                }
              }}>
                Team
              </ToggleButton>
            </ToggleButtonGroup>
          </Card>
        </Box>
        <Typography sx={{
          fontWeight: 600,
          color: "#172b4d",
          fontSize: "1.5rem",
          lineHeight: 1.2,
          }}
          mt={3}
        >
          Task Progress
        </Typography>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Box sx={{
            width: "100%",
            gap: 3,
            display: "flex",
            flexDirection: "row",
            marginTop: 3,
            marginLeft: 2
          }}>
            <Grid sx={{width: "30%"}}>
              <Card sx={{
                width: "100%",
                height: 430,
                backgroundColor: "#F0F8FF",
                borderRadius: 4,
                boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                border: "1px solid #e4e6ea",
                flexShrink: 0,
                display: "flex",
                overflow: "hidden"
              }}>
                <CardContent sx={{flex: 1, padding:2.5}}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <AssignmentOutlinedIcon sx={{fontSize: 40, color: "#2462AB"}} />
                    <Typography gutterBottom variant="h6" component="div" sx={{fontWeight: 600}}>To-Do</Typography>
                  </Box>
                  <Droppable droppableId="To Do">
                    {(provided) => (
                      <Box
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5
                        }}
                      >
                        {taskList.filter(task => task.status === "To Do" && filterTasks(task)).map((task, index) => (
                          <Draggable key={task.taskId} draggableId={String(task.taskId)} index={index}>
                            {(provided) => (
                              <Box
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <TaskCard 
                                  task={task} 
                                  color="#ABCDFD" 
                                  onDeleted={handleTaskDeleted} 
                                  onTaskUpdated={handleTaskUpdated}
                                  members={members}
                                />
                              </Box>
                            )}
                          </Draggable>
                        ))}
                        <Box sx={{ height: 30 }} />
                        {provided.placeholder}
                      </Box>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </Grid>
            <Grid sx={{width: "30%"}}>
              <Card sx={{
                width: "100%",
                height: 430,
                backgroundColor: "#FFF9EC",
                borderRadius: 4,
                boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                border: "1px solid #e4e6ea",
                flexShrink: 0,
                display: "flex",
                overflow: "hidden"
              }}>
                <CardContent sx={{flex: 1, padding: 2.5}}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <ArrowCircleRightOutlinedIcon sx={{fontSize: 40,color: "#FDA12C"}}/>
                    <Typography gutterBottom variant="h6" component="div" sx={{fontWeight: 600}}>In Progress</Typography>
                  </Box>
                  <Droppable droppableId="In Progress">
                    {(provided) => (
                      <Box
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        {taskList.filter(task => task.status === "In Progress" && filterTasks(task)).map((task, index) => (
                          <Draggable key={task.taskId} draggableId={task.taskId} index={index}>
                            {(provided) => (
                              <Box
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <TaskCard 
                                  task={task} 
                                  color="#FED59E" 
                                  onDeleted={handleTaskDeleted} 
                                  onTaskUpdated={handleTaskUpdated}
                                  members={members}
                                />
                              </Box>
                            )}
                          </Draggable>
                        ))}
                        <Box sx={{height: 30 }} />
                        {provided.placeholder}
                      </Box>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </Grid>
            <Grid sx={{width: "30%"}}>
              <Card sx={{
                width: "100%",
                height: 430,
                backgroundColor: "#F3FFF4",
                borderRadius: 4,
                boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                border: "1px solid #e4e6ea",
                flexShrink: 0,
                display: "flex",
                overflow: "hidden"
              }}>
                <CardContent sx={{flex: 1,padding: 2.5}}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <TaskAltOutlinedIcon sx={{fontSize: 40,color: "#5DAE78"}}/>
                    <Typography gutterBottom variant="h6" component="div" sx={{fontWeight: 600}}>
                      Done
                    </Typography>
                  </Box>
                  <Droppable droppableId="Done">
                    {(provided) => (
                      <Box
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        sx={{
                        display: "flex",
                        flexDirection: "column"
                      }}
                      >
                        {taskList.filter(task => task.status === "Done" && filterTasks(task)).map((task, index) => (
                          <Draggable key={task.taskId} draggableId={String(task.taskId)} index={index}>
                            {(provided) => (
                              <Box
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <TaskCard 
                                  task={task} 
                                  color="#7FE3BA" 
                                  onDeleted={handleTaskDeleted} 
                                  onTaskUpdated={handleTaskUpdated}
                                  members={members}
                                />
                              </Box>
                            )}
                          </Draggable>
                        ))}
                        <Box sx={{ height: 30 }} />
                        {provided.placeholder}
                      </Box>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </Grid>
          </Box>
        </DragDropContext>
        <Box sx={{
          display: "flex",
          justifyContent: "flex-end",
          marginRight: 4,
          marginTop: 1.5
        }}>
          <Button variant="outlined" sx={{
            textTransform: "none",
            borderRadius: 2 }}
            startIcon={<ReplyAllOutlinedIcon sx={{transform: "scaleX(-1)"}}/>}
            onClick={()=>{
              if(isConnected){
                setGitlabDialogOpen(true);
              }else{
                setSnackOpen(true);
              }
            }}
          >
            GitLab
          </Button>
        </Box>
        <GitLabDialog 
          open={gitlabDialogOpen}
          onClose={() => setGitlabDialogOpen(false)}
          user={userId}
          onSelect={handleGitlabImport}
        />
        <Snackbar
          open={snackOpen}
          autoHideDuration={3000}
          onClose={() => {setSnackOpen(false)}}
          anchorOrigin={{ vertical: "top", horizontal: "center"}}
        >
          <Alert severity="error" onClose={() => {
            setSnackOpen(false)
          }}>
            Your GitLab Account is not connected!
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  )
}
export default Tasks