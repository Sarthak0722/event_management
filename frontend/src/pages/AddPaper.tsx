import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  IconButton,
  Snackbar,
  Alert,
  MenuItem
} from '@mui/material';
import { AddCircleOutline, RemoveCircleOutline } from '@mui/icons-material';
import axios from '../config/axios';

type PresenterField = 'name' | 'email' | 'phone';

interface Presenter {
  name: string;
  email: string;
  phone: string;
}

const DOMAIN_OPTIONS = [
  'Advanced Communication Technologies',
  'ICT in Engineering Education',
  'Artificial Intelligence, Machine Learning and Computational Intelligence',
  'Cognitive Systems, Vision and Perception',
  'Embedded Systems and Internet of Things',
  'Data Storage, Modeling and Big Data Analytics',
  'Cyber Security'
];

const AddPaper: React.FC = () => {
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [presenters, setPresenters] = useState<Presenter[]>([
    { name: '', email: '', phone: '' }
  ]);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const handlePresenterChange = (
    index: number,
    field: PresenterField,
    value: string
  ) => {
    const updated = [...presenters];
    updated[index][field] = value;
    setPresenters(updated);
  };

  const addPresenter = () => {
    setPresenters([...presenters, { name: '', email: '', phone: '' }]);
  };

  const removePresenter = (index: number) => {
    const updated = presenters.filter((_, i) => i !== index);
    setPresenters(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !domain || !synopsis || presenters.length === 0) {
      setSnackbar({
        open: true,
        message: 'All fields are required, including at least one presenter.',
        severity: 'error'
      });
      return;
    }

    try {
      const response = await axios.post('/papers/admin-add', {
        title,
        domain,
        synopsis,
        presenters
      });

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Paper added successfully!',
          severity: 'success'
        });

        // Clear form
        setTitle('');
        setDomain('');
        setSynopsis('');
        setPresenters([{ name: '', email: '', phone: '' }]);
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || 'Failed to add paper.',
          severity: 'error'
        });
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Error adding paper',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Add New Paper
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
            required
          />

          <TextField
            select
            fullWidth
            label="Domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            margin="normal"
            required
          >
            {DOMAIN_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Synopsis"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            margin="normal"
            multiline
            rows={4}
            required
          />

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Presenters</Typography>
            {presenters.map((presenter, index) => (
              <Grid container spacing={2} key={index} alignItems="center" sx={{ mt: 1 }}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Name"
                    fullWidth
                    value={presenter.name}
                    onChange={(e) =>
                      handlePresenterChange(index, 'name', e.target.value)
                    }
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Email"
                    fullWidth
                    value={presenter.email}
                    onChange={(e) =>
                      handlePresenterChange(index, 'email', e.target.value)
                    }
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Phone"
                    fullWidth
                    value={presenter.phone}
                    onChange={(e) =>
                      handlePresenterChange(index, 'phone', e.target.value)
                    }
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={1}>
                  <IconButton
                    onClick={() => removePresenter(index)}
                    disabled={presenters.length === 1}
                  >
                    <RemoveCircleOutline />
                  </IconButton>
                </Grid>
              </Grid>
            ))}

            <Button
              startIcon={<AddCircleOutline />}
              onClick={addPresenter}
              sx={{ mt: 2 }}
            >
              Add Presenter
            </Button>
          </Box>

          <Button type="submit" variant="contained" color="primary" sx={{ mt: 4 }}>
            Submit Paper
          </Button>
        </form>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AddPaper;
