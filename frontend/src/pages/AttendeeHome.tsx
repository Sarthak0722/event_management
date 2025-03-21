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
  Divider,
  SelectChangeEvent,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Search as SearchIcon,
  Event as EventIcon,
  Room as RoomIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Logout as LogoutIcon,
  Domain as DomainIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';

interface Paper {
  _id: string;
  title: string;
  domain: string;
  presenters: Array<{
    name: string;
    email: string;
    contact?: string;
  }>;
  synopsis: string;
  teamId: string;
  selectedSlot?: {
    date: string;
    room: string;
    timeSlot: string;
  };
}

interface TimeSlot {
  time: string;
  papers: Paper[];
}

interface ApiResponse {
  success: boolean;
  data: {
    [domain: string]: Paper[];
  };
  message?: string;
}

interface DomainGroup {
  [domain: string]: {
    [room: string]: Paper[];
  };
}

const ALLOWED_DATES = [
  '2026-01-09',
  '2026-01-10',
  '2026-01-11'
];

const AttendeeHome = () => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(ALLOWED_DATES[0]));
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDomain, setExpandedDomain] = useState<string | false>(false);
  const [expandedRooms, setExpandedRooms] = useState<{ [key: string]: boolean }>({});
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      fetchPapersByDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchPapersByDate = async (date: Date) => {
    try {
      setLoading(true);
      setError(null);
      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await axios.get<ApiResponse>('/papers/by-date', {
        params: { date: formattedDate }
      });
      
      if (response.data.success) {
        const papersByDomain = response.data.data;
        const allPapers: Paper[] = [];
        Object.values(papersByDomain).forEach(papers => {
          allPapers.push(...papers);
        });
        setPapers(allPapers);
      } else {
        setError('Failed to fetch papers');
      }
    } catch (err) {
      console.error('Error fetching papers:', err);
      setError('Failed to load papers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
  };

  const handleLogout = () => {
    logout();
  };

  const isDateDisabled = (date: Date) => {
    return !ALLOWED_DATES.includes(format(date, 'yyyy-MM-dd'));
  };

  const filteredPapers = papers.filter(paper => {
    const matchesDomain = selectedDomain === 'All' || paper.domain === selectedDomain;
    const matchesSearch = searchTerm === '' || 
      paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paper.presenters.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesDomain && matchesSearch;
  });

  const groupedByDomain = filteredPapers.reduce((acc, paper) => {
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
  }, {} as DomainGroup);

  const handleDomainChange = (domain: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedDomain(isExpanded ? domain : false);
  };

  const handleRoomChange = (domainRoom: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedRooms(prev => ({
      ...prev,
      [domainRoom]: isExpanded
    }));
  };

  const handleViewDetails = (paper: Paper) => {
    setSelectedPaper(paper);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedPaper(null);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Conference Timetable
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
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Select Date"
                value={selectedDate}
                onChange={handleDateChange}
                shouldDisableDate={isDateDisabled}
                defaultCalendarMonth={new Date(ALLOWED_DATES[0])}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Search"
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
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Domain</InputLabel>
              <Select
                value={selectedDomain}
                label="Domain"
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

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Loading schedule...</Typography>
          </Box>
        ) : Object.keys(groupedByDomain).length === 0 ? (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 2, border: 1, borderColor: 'divider' }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No Presentations Scheduled
            </Typography>
            <Typography color="textSecondary">
              There are no presentations scheduled for this date.
            </Typography>
          </Paper>
        ) : (
          Object.entries(groupedByDomain).map(([domain, rooms]) => (
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
                    onChange={handleRoomChange(`${domain}-${room}`)}
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
          ))
        )}

        {/* Add Paper Details Dialog */}
        <Dialog
          open={detailsDialogOpen}
          onClose={handleCloseDetails}
          maxWidth="md"
          fullWidth
        >
          {selectedPaper && (
            <>
              <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Paper Details</Typography>
                  <IconButton onClick={handleCloseDetails} size="small">
                    <CloseIcon />
                  </IconButton>
                </Box>
              </DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h5" gutterBottom>
                      {selectedPaper.title}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      <Chip
                        icon={<DomainIcon />}
                        label={selectedPaper.domain}
                        color="primary"
                      />
                      {selectedPaper.selectedSlot && (
                        <>
                          <Chip
                            icon={<RoomIcon />}
                            label={`Room ${selectedPaper.selectedSlot.room}`}
                          />
                          <Chip
                            icon={<ScheduleIcon />}
                            label={selectedPaper.selectedSlot.timeSlot}
                          />
                          <Chip
                            icon={<EventIcon />}
                            label={format(new Date(selectedPaper.selectedSlot.date), 'dd MMM yyyy')}
                          />
                        </>
                      )}
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Presenters
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {selectedPaper.presenters.map((presenter, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <PersonIcon color="action" fontSize="small" />
                          <Typography>{presenter.name}</Typography>
                          {presenter.email && (
                            <>
                              <Typography color="textSecondary" sx={{ mx: 1 }}>•</Typography>
                              <Typography color="textSecondary">{presenter.email}</Typography>
                            </>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Synopsis
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {selectedPaper.synopsis}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Paper ID:
                      </Typography>
                      <Chip size="small" label={selectedPaper.teamId} />
                    </Box>
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseDetails}>Close</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
    </Box>
  );
};

export default AttendeeHome;