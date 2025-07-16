import React from 'react';
import { Container, Typography } from '@mui/material';

const Login = () => (
  <Container component="main" maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Typography variant="h5">Login is disabled. Please use the user selector at the top to choose a user view.</Typography>
  </Container>
);

export default Login; 