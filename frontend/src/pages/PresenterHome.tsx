import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../config/axios';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Paper,
  Chip,
  IconButton,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  useTheme,
  AppBar,
  Toolbar,
  Avatar,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Event as EventIcon,
  Room as RoomIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Logout as LogoutIcon,
  Assignment as AssignmentIcon,
  Domain as DomainIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import PaperDetails from '../components/PaperDetails';

interface Presenter {
  name: string;
  email: string;
  contact: string;
  hasSelectedSlot: boolean;
}

interface Paper {
  _id: string;
  title: string;
  domain: string;
  presenters: Presenter[];
  synopsis: string;
  room: number | null;
  timeSlot: string | null;
  teamId: string;
  day: number | null;
  isSlotAllocated: boolean;
}

interface AvailableSlot {
  room: number;
  availableTimeSlots: string[];
}

const PresenterHome = () => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [slotSelectionOpen, setSlotSelectionOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<number | ''>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | ''>('');
  const [slotError, setSlotError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPresenterPapers();
  }, [user?.email]);

  const fetchPresenterPapers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/papers/presenter/${user?.email}`);
      if (response.data.success) {
        setPapers(response.data.data);
      } else {
        setError('Failed to fetch papers');
      }
    } catch (err) {
      console.error('Error fetching papers:', err);
      setError('Failed to load your papers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchTerm.trim() && selectedDomain === 'All') {
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const results = papers.filter(paper =>
      (selectedDomain === 'All' || paper.domain === selectedDomain) &&
      (paper.title.toLowerCase().includes(searchTermLower) ||
      paper.synopsis.toLowerCase().includes(searchTermLower))
    );

    setPapers(results);
  };

  const handleViewDetails = (paper: Paper) => {
    setSelectedPaper(paper);
    setDetailsOpen(true);
  };

  const handleSelectSlot = async (paper: Paper) => {
    try {
      setSelectedPaper(paper);
      setSlotError(null);
      const response = await axios.get(`/api/papers/available-slots/${paper.domain}`);
      if (response.data.success) {
        setAvailableSlots(response.data.data);
        setSlotSelectionOpen(true);
      }
    } catch (err) {
      console.error('Error fetching available slots:', err);
      setSlotError('Failed to load available slots. Please try again.');
    }
  };

  const handleSlotSubmit = async () => {
    if (!selectedRoom || !selectedTimeSlot || !selectedPaper || !user?.email) {
      setSlotError('Please select both room and time slot');
      return;
    }

    try {
      const response = await axios.post(`/api/papers/select-slot/${selectedPaper._id}`, {
        room: selectedRoom,
        timeSlot: selectedTimeSlot,
        presenterEmail: user.email
      });

      if (response.data.success) {
        setSuccessMessage('Slot selected successfully!');
        setPapers(prevPapers => 
          prevPapers.map(p => 
            p._id === selectedPaper._id ? response.data.data : p
          )
        );
        setSlotSelectionOpen(false);
        setSelectedRoom('');
        setSelectedTimeSlot('');
      }
    } catch (err: any) {
      setSlotError(err.response?.data?.message || 'Failed to select slot');
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography>Loading your papers...</Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Presenter Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              {user?.email}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2, border: 1, borderColor: 'divider' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                size="small"
                label="Search Papers"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Domain</InputLabel>
                <Select
                  value={selectedDomain}
                  label="Filter by Domain"
                  onChange={(e) => setSelectedDomain(e.target.value)}
                >
                  <MenuItem value="All">All Domains</MenuItem>
                  {Array.from(new Set(papers.map(p => p.domain))).map((domain) => (
                    <MenuItem key={domain} value={domain}>
                      {domain}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {papers.length === 0 ? (
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              borderRadius: 2,
              border: 1,
              borderColor: 'divider'
            }}
          >
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No Papers Found
            </Typography>
            <Typography color="textSecondary">
              You haven't submitted any papers yet or your search returned no results.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {papers.map((paper) => (
              <Grid item xs={12} key={paper._id}>
                <Card 
                  elevation={0}
                  sx={{ 
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: 1
                    }
                  }}
                >
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box>
                            <Typography variant="h6" gutterBottom>
                              {paper.title}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                              <Chip
                                size="small"
                                icon={<DomainIcon />}
                                label={paper.domain}
                                color="primary"
                              />
                              <Chip
                                size="small"
                                icon={<AssignmentIcon />}
                                label={`ID: ${paper.teamId}`}
                              />
                              <Chip
                                size="small"
                                icon={paper.isSlotAllocated ? <CheckCircleIcon /> : <WarningIcon />}
                                label={paper.isSlotAllocated ? 'Slot Allocated' : 'No Slot Selected'}
                                color={paper.isSlotAllocated ? 'success' : 'warning'}
                              />
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleViewDetails(paper)}
                              startIcon={<PersonIcon />}
                            >
                              View Details
                            </Button>
                            {!paper.isSlotAllocated && (
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => handleSelectSlot(paper)}
                                startIcon={<ScheduleIcon />}
                              >
                                Select Slot
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </Grid>
                      {paper.isSlotAllocated && (
                        <Grid item xs={12}>
                          <Divider sx={{ mb: 2 }} />
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Chip
                              size="small"
                              icon={<RoomIcon />}
                              label={`Room ${paper.room}`}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              icon={<ScheduleIcon />}
                              label={paper.timeSlot}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              icon={<EventIcon />}
                              label={`Day ${paper.day}`}
                              variant="outlined"
                            />
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <PaperDetails
          paper={selectedPaper}
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
        />

        <Dialog 
          open={slotSelectionOpen} 
          onClose={() => setSlotSelectionOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2
            }
          }}
        >
          <DialogTitle>
            <Typography variant="h6">Select Presentation Slot</Typography>
          </DialogTitle>
          <DialogContent>
            {slotError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {slotError}
              </Alert>
            )}
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Room</InputLabel>
                <Select
                  value={selectedRoom}
                  label="Room"
                  onChange={(e) => setSelectedRoom(e.target.value as number)}
                >
                  {availableSlots.map((slot) => (
                    <MenuItem key={slot.room} value={slot.room}>
                      Room {slot.room}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Time Slot</InputLabel>
                <Select
                  value={selectedTimeSlot}
                  label="Time Slot"
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  disabled={!selectedRoom}
                >
                  {selectedRoom && availableSlots
                    .find(slot => slot.room === selectedRoom)
                    ?.availableTimeSlots.map((timeSlot) => (
                      <MenuItem key={timeSlot} value={timeSlot}>
                        {timeSlot}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setSlotSelectionOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSlotSubmit} 
              variant="contained" 
              startIcon={<ScheduleIcon />}
            >
              Confirm Slot
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default PresenterHome; 