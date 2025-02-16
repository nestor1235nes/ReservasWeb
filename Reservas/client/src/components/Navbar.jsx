import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";

export function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  console.log(isAuthenticated, user);

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link to={isAuthenticated ? "/tasks" : "/"} style={{ color: 'inherit', textDecoration: 'none' }}>
            Task Manager
          </Link>
        </Typography>
        <Box>
          {isAuthenticated ? (
            <>
              <Typography variant="body1" component="span" sx={{ marginRight: 2 }}>
                Welcome {user.username}
              </Typography>
              <Button color="inherit" component={Link} to="/add-task">
                Add Task
              </Button>
              <Button color="inherit" component={Link} to="/" onClick={() => logout()}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">
                Login
              </Button>
              <Button color="inherit" component={Link} to="/register">
                Register
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}