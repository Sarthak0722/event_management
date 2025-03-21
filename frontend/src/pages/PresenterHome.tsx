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
  Paper as MuiPaper,
  Chip,
  IconButton,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  useTheme,
  AppBar,
  Toolbar,
  SelectChangeEvent
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
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import PaperDetails from '../components/PaperDetails';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { Paper, Presenter } from '../types/paper';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';

interface AvailableSlot {
  room: string;
  timeSlots: string[];
}

const ALLOWED_DATES = [
  '2026-01-09',
  '2026-01-10',
  '2026-01-11'
];

type SearchCriteria = 'default' | 'paperId' | 'title' | 'presenter';

const PresenterHome = () => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [slotSelectionOpen, setSlotSelectionOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [slotError, setSlotError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [scheduledPapers, setScheduledPapers] = useState<Paper[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>('default');
  const [expandedDomain, setExpandedDomain] = useState<string | false>(false);
  const [expandedRooms, setExpandedRooms] = useState<{ [key: string]: boolean }>({});
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    fetchPresenterPapers();
  }, [user?.email]);

  useEffect(() => {
    // Check if any paper has a booked slot
    const hasBookedSlot = papers.some(paper => paper.selectedSlot?.bookedBy);
    setShowSchedule(hasBookedSlot);
    
    if (hasBookedSlot) {
      fetchScheduledPapers();
    }
  }, [papers]);

  const fetchPresenterPapers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/papers/presenter', {
        params: { email: user?.email }
      });
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

  const fetchScheduledPapers = async () => {
    try {
      if (!papers[0]?.selectedSlot?.date) return;
      
      const response = await axios.get('/papers/by-date', {
        params: { date: papers[0].selectedSlot.date }
      });
      
      if (response.data.success) {
        const papersByDomain = response.data.data as { [key: string]: Paper[] };
        const allPapers: Paper[] = [];
        Object.values(papersByDomain).forEach(papers => {
          allPapers.push(...papers);
        });
        setScheduledPapers(allPapers);
      }
    } catch (error) {
      console.error('Error fetching scheduled papers:', error);
    }
  };

  const handleViewDetails = (paper: Paper) => {
    setSelectedPaper(paper);
    setDetailsOpen(true);
  };

  const handleOpenDialog = (paper: Paper) => {
    if (paper.selectedSlot && paper.selectedSlot.bookedBy) {
      const bookedByPresenter = paper.presenters.find(p => p.email === paper.selectedSlot?.bookedBy);
      if (paper.selectedSlot.bookedBy !== user?.email) {
        setError(`This slot has already been booked by ${bookedByPresenter?.name || 'another presenter'}`);
        return;
      }
    }

    setSelectedPaper(paper);
    setSelectedDate(null);
    setSelectedRoom('');
    setSelectedTimeSlot('');
    setSlotSelectionOpen(true);
    setError('');
    setSuccessMessage('');
  };

  const handleCloseDialog = () => {
    setSlotSelectionOpen(false);
    setSelectedPaper(null);
    setSelectedDate(null);
    setSelectedRoom('');
    setSelectedTimeSlot('');
    setError('');
    setSuccessMessage('');
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    setSelectedRoom('');
    setSelectedTimeSlot('');
    if (date && selectedPaper) {
      fetchAvailableSlots(selectedPaper.domain, date);
    }
  };

  const handleRoomSelectChange = (event: SelectChangeEvent<string>) => {
    setSelectedRoom(event.target.value);
    setSelectedTimeSlot('');
  };

  const handleAccordionRoomChange = (domainRoom: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedRooms(prev => ({
      ...prev,
      [domainRoom]: isExpanded
    }));
  };

  const handleTimeSlotChange = (event: SelectChangeEvent<string>) => {
    setSelectedTimeSlot(event.target.value);
  };

  const fetchAvailableSlots = async (domain: string, date: Date) => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await axios.get('/papers/available-slots', {
        params: { domain, date: formattedDate }
      });
      if (response.data.success) {
        setAvailableSlots(response.data.data.availableSlots);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch available slots');
    }
  };

  const isDateDisabled = (date: Date) => {
    return !ALLOWED_DATES.includes(format(date, 'yyyy-MM-dd'));
  };

  const handleSubmit = async () => {
    if (!selectedPaper || !selectedDate || !selectedRoom || !selectedTimeSlot || !user?.email) {
      setError('Please select all required fields');
      return;
    }

    try {
      const response = await axios.post('/papers/select-slot', {
        paperId: selectedPaper._id,
        date: format(selectedDate, 'yyyy-MM-dd'),
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
        setTimeout(handleCloseDialog, 2000);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to select slot');
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleDomainChange = (domain: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedDomain(isExpanded ? domain : false);
  };

  const filteredScheduledPapers = scheduledPapers.filter(paper => {
    if (!showSchedule) return false;
    
    const searchTermLower = searchTerm.toLowerCase().trim();
    
    let matchesSearch = true;
    if (searchTermLower !== '') {
      switch (searchCriteria) {
        case 'paperId':
          matchesSearch = paper.paperId.toLowerCase().includes(searchTermLower);
          break;
        case 'title':
          matchesSearch = paper.title.toLowerCase().includes(searchTermLower);
          break;
        case 'presenter':
          matchesSearch = paper.presenters.some(p => 
            p.name.toLowerCase().includes(searchTermLower) ||
            p.email.toLowerCase().includes(searchTermLower)
          );
          break;
        default:
          matchesSearch = 
            paper.paperId.toLowerCase().includes(searchTermLower) ||
            paper.title.toLowerCase().includes(searchTermLower) ||
            paper.presenters.some(p => 
              p.name.toLowerCase().includes(searchTermLower) ||
              p.email.toLowerCase().includes(searchTermLower)
            );
      }
    }
    
    return matchesSearch;
  });

  const groupedByDomain = filteredScheduledPapers.reduce((acc, paper) => {
    if (!paper.selectedSlot) return acc;
    
    const { domain } = paper;
    const room = paper.selectedSlot.room;
    
    if (!acc[domain]) {
      acc[domain] = {};
    }
    if (!acc[domain][room]) {
      acc[domain][room] = [];
    }
    
    acc[domain][room].push(paper);
    return acc;
  }, {} as { [domain: string]: { [room: string]: Paper[] } });

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

        {papers.length === 0 ? (
          <MuiPaper 
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
              You haven't submitted any papers yet.
            </Typography>
          </MuiPaper>
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
                                label={`Paper ID: ${paper.paperId}`}
                                color="secondary"
                              />
                              {paper.selectedSlot && paper.selectedSlot.bookedBy ? (
                                <Chip
                                  size="small"
                                  icon={<CheckCircleIcon />}
                                  label={paper.selectedSlot.bookedBy === user?.email ? 'Booked by you' : 'Slot Booked'}
                                  color={paper.selectedSlot.bookedBy === user?.email ? 'success' : 'default'}
                                />
                              ) : (
                                <Chip
                                  size="small"
                                  icon={<WarningIcon />}
                                  label="No Slot Selected"
                                  color="warning"
                                />
                              )}
                            </Box>
                            {paper.selectedSlot && paper.selectedSlot.bookedBy && (
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                  size="small"
                                  icon={<EventIcon />}
                                  label={format(new Date(paper.selectedSlot.date), 'dd MMM yyyy')}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  icon={<RoomIcon />}
                                  label={`Room ${paper.selectedSlot.room}`}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  icon={<ScheduleIcon />}
                                  label={paper.selectedSlot.timeSlot}
                                  variant="outlined"
                                />
                                {paper.selectedSlot.bookedBy !== user?.email && (
                                  <Chip
                                    size="small"
                                    icon={<PersonIcon />}
                                    label={`Booked by: ${paper.presenters.find(p => p.email === paper.selectedSlot?.bookedBy)?.name}`}
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            )}
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
                            {(!paper.selectedSlot?.bookedBy || paper.selectedSlot?.bookedBy === user?.email) && (
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => handleOpenDialog(paper)}
                                startIcon={<ScheduleIcon />}
                              >
                                {paper.selectedSlot?.bookedBy ? 'Change Slot' : 'Select Slot'}
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {showSchedule && (
          <Box sx={{ mt: 6 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              Scheduled Presentations
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Search By</InputLabel>
                    <Select
                      value={searchCriteria}
                      label="Search By"
                      onChange={(e) => setSearchCriteria(e.target.value as SearchCriteria)}
                    >
                      <MenuItem value="default">All Fields</MenuItem>
                      <MenuItem value="paperId">Paper ID</MenuItem>
                      <MenuItem value="title">Title</MenuItem>
                      <MenuItem value="presenter">Presenter</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    size="small"
                    label={`Search by ${searchCriteria === 'default' ? 'all fields' : searchCriteria}`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Grid>
            </Grid>

            {Object.entries(groupedByDomain).map(([domain, rooms]) => (
              <Accordion
                key={domain}
                expanded={expandedDomain === domain}
                onChange={handleDomainChange(domain)}
                sx={{
                  mb: 2,
                  '&:before': { display: 'none' },
                  borderRadius: '8px !important',
                  overflow: 'hidden',
                  border: 1,
                  borderColor: 'divider'
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    backgroundColor: theme.palette.primary.light,
                    color: 'white',
                    '& .MuiAccordionSummary-expandIconWrapper': {
                      color: 'white'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <DomainIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      {domain}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${Object.keys(rooms).length} Rooms`}
                      sx={{ ml: 2, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  {Object.entries(rooms).map(([room, papers]) => (
                    <Accordion
                      key={`${domain}-${room}`}
                      expanded={expandedRooms[`${domain}-${room}`] || false}
                      onChange={(event, isExpanded) => handleAccordionRoomChange(`${domain}-${room}`)(event, isExpanded)}
                      disableGutters
                      sx={{
                        '&:before': { display: 'none' },
                        boxShadow: 'none',
                        borderTop: 1,
                        borderColor: 'divider',
                        '&:first-of-type': {
                          borderTop: 0
                        }
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          backgroundColor: theme.palette.grey[50],
                          '&:hover': {
                            backgroundColor: theme.palette.grey[100]
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <RoomIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                          <Typography variant="subtitle1" color="primary">
                            Room {room}
                          </Typography>
                          <Chip
                            size="small"
                            label={`${papers.length} Presentations`}
                            sx={{ ml: 2 }}
                          />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                          {papers
                            .sort((a, b) => 
                              (a.selectedSlot?.timeSlot || '').localeCompare(b.selectedSlot?.timeSlot || '')
                            )
                            .map((paper) => (
                              <Grid item xs={12} key={paper._id}>
                                <Card elevation={0} sx={{ 
                                  border: 1, 
                                  borderColor: 'divider'
                                }}>
                                  <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                      <Box>
                                        <Typography variant="h6" gutterBottom>
                                          {paper.title}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                          <Chip
                                            size="small"
                                            icon={<ScheduleIcon />}
                                            label={paper.selectedSlot?.timeSlot}
                                            color="primary"
                                          />
                                          <Chip
                                            size="small"
                                            icon={<PersonIcon />}
                                            label={paper.presenters[0]?.name || 'No presenter'}
                                          />
                                          <Chip
                                            size="small"
                                            icon={<AssignmentIcon />}
                                            label={`Paper ID: ${paper.paperId}`}
                                            color="secondary"
                                          />
                                        </Box>
                                      </Box>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => handleViewDetails(paper)}
                                        startIcon={<EventIcon />}
                                      >
                                        View Details
                                      </Button>
                                    </Box>
                                    <Typography variant="body2" color="textSecondary">
                                      {paper.synopsis.substring(0, 150)}...
                                    </Typography>
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        <PaperDetails
          paper={selectedPaper}
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
        />

        <Dialog 
          open={slotSelectionOpen} 
          onClose={handleCloseDialog}
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
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Select Date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  shouldDisableDate={isDateDisabled}
                  defaultCalendarMonth={new Date('2026-01-09')}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      sx: { mb: 2 }
                    }
                  }}
                />
              </LocalizationProvider>

              {selectedDate && (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Room</InputLabel>
                  <Select
                    value={selectedRoom}
                    label="Room"
                    onChange={handleRoomSelectChange}
                  >
                    {availableSlots.map((slot) => (
                      <MenuItem key={slot.room} value={slot.room}>
                        {slot.room}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {selectedRoom && (
                <FormControl fullWidth>
                  <InputLabel>Time Slot</InputLabel>
                  <Select
                    value={selectedTimeSlot}
                    label="Time Slot"
                    onChange={handleTimeSlotChange}
                  >
                    {selectedRoom && availableSlots
                      .find(slot => slot.room === selectedRoom)
                      ?.timeSlots.map((timeSlot) => (
                        <MenuItem key={timeSlot} value={timeSlot}>
                          {timeSlot}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained" 
              startIcon={<ScheduleIcon />}
              disabled={!selectedDate || !selectedRoom || !selectedTimeSlot}
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