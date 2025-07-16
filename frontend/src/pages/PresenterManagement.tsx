import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import axios from '../config/axios';

interface Presenter {
  _id: string;
  name: string;
  email: string;
  papers: Paper[];
  attendance: boolean;
  rating?: number;
  substitutes?: string[];
}

interface Paper {
  _id: string;
  title: string;
  domain: string;
  status: string;
  presentationTime?: string;
}

const PresenterManagement: React.FC = () => {
  const [presenters, setPresenters] = useState<Presenter[]>([]);
  const [selectedPresenter, setSelectedPresenter] = useState<Presenter | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [substitute, setSubstitute] = useState('');

  useEffect(() => {
    fetchPresenters();
  }, []);

  const fetchPresenters = async () => {
    try {
      const response = await axios.get('/api/presenters');
      setPresenters(response.data);
    } catch (error) {
      console.error('Error fetching presenters:', error);
    }
  };

  const handleAttendanceChange = async (presenterId: string, attendance: boolean) => {
    try {
      await axios.patch(`/api/presenters/${presenterId}/attendance`, {
        attendance,
      });
      fetchPresenters();
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  const handleAddSubstitute = async () => {
    if (!selectedPresenter || !substitute) return;

    try {
      await axios.post(`/api/presenters/${selectedPresenter._id}/substitutes`, {
        substitute,
      });
      setSubstitute('');
      setOpenDialog(false);
      fetchPresenters();
    } catch (error) {
      console.error('Error adding substitute:', error);
    }
  };

  const handleRemoveSubstitute = async (presenterId: string, substituteEmail: string) => {
    try {
      await axios.delete(`/api/presenters/${presenterId}/substitutes/${substituteEmail}`);
      fetchPresenters();
    } catch (error) {
      console.error('Error removing substitute:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Presenter List */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Presenter Management
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Papers</TableCell>
                    <TableCell>Attendance</TableCell>
                    <TableCell>Substitutes</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {presenters.map((presenter) => (
                    <TableRow key={presenter._id}>
                      <TableCell>{presenter.name}</TableCell>
                      <TableCell>{presenter.email}</TableCell>
                      <TableCell>
                        {presenter.papers.map((paper) => (
                          <Chip
                            key={paper._id}
                            label={paper.title}
                            size="small"
                            sx={{ m: 0.5 }}
                          />
                        ))}
                      </TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={presenter.attendance}
                              onChange={(e) =>
                                handleAttendanceChange(
                                  presenter._id,
                                  e.target.checked
                                )
                              }
                            />
                          }
                          label={presenter.attendance ? 'Present' : 'Absent'}
                        />
                      </TableCell>
                      <TableCell>
                        {presenter.substitutes?.map((sub) => (
                          <Chip
                            key={sub}
                            label={sub}
                            onDelete={() =>
                              handleRemoveSubstitute(presenter._id, sub)
                            }
                            size="small"
                            sx={{ m: 0.5 }}
                          />
                        ))}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Add Substitute">
                          <IconButton
                            onClick={() => {
                              setSelectedPresenter(presenter);
                              setOpenDialog(true);
                            }}
                          >
                            <PersonAddIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View History">
                          <IconButton
                            onClick={() => {
                              setSelectedPresenter(presenter);
                              setOpenHistoryDialog(true);
                            }}
                          >
                            <HistoryIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Add Substitute Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Add Substitute Presenter</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Substitute Email"
            type="email"
            fullWidth
            value={substitute}
            onChange={(e) => setSubstitute(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddSubstitute} color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Presenter History Dialog */}
      <Dialog
        open={openHistoryDialog}
        onClose={() => setOpenHistoryDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Presenter History</DialogTitle>
        <DialogContent>
          {selectedPresenter && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedPresenter.name}
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Paper Title</TableCell>
                    <TableCell>Domain</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Presentation Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedPresenter.papers.map((paper) => (
                    <TableRow key={paper._id}>
                      <TableCell>{paper.title}</TableCell>
                      <TableCell>{paper.domain}</TableCell>
                      <TableCell>{paper.status}</TableCell>
                      <TableCell>
                        {paper.presentationTime
                          ? new Date(paper.presentationTime).toLocaleString()
                          : 'Not scheduled'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PresenterManagement; 