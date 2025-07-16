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
  AccordionDetails,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  tableCellClasses,
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
  Close as CloseIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { alpha, styled, Theme } from '@mui/material/styles';
import NotificationBell from '../components/NotificationBell';

interface Paper {
  _id: string;
  title: string;
  domain: string;
  paperId: string;
  presenters: Array<{
    name: string;
    email: string;
    phone: string;
  }>;
  synopsis: string;
  selectedSlot?: {
    date: string;
    room: string;
    session: string;
    bookedBy?: string;
  };
  presentationStatus: 'Scheduled' | 'In Progress' | 'Presented' | 'Cancelled';
  isSpecialSession?: boolean;
  speaker?: string;
  sessionType?: 'Guest Lecture' | 'Keynote Speech' | 'Cultural Event' | 'Workshop';
  startTime?: string;
  endTime?: string;
  date?: string;
  room?: string;
  description?: string;
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

type SearchCriteria = 'default' | 'paperId' | 'title' | 'presenter';

const ALLOWED_DATES = [
  '2026-01-09',
  '2026-01-10',
  '2026-01-11'
];

// Add styled components for the table
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
    fontWeight: 600,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: alpha(theme.palette.primary.main, 0.02),
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
  // hide last border
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

const AttendeeHome = () => {
  const theme = useTheme();
  const { user, setUserType } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(ALLOWED_DATES[0]));
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [expandedDomain, setExpandedDomain] = useState<string | false>(false);
  const [expandedRooms, setExpandedRooms] = useState<{ [key: string]: boolean }>({});
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>('default');

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
      
      // Fetch both papers and special sessions
      const [papersResponse, specialSessionsResponse] = await Promise.all([
        axios.get<ApiResponse>('/papers/by-date', {
          params: { date: formattedDate }
        }),
        axios.get<ApiResponse>('/special-sessions/by-date', {
          params: { date: formattedDate }
        })
      ]);
      
      if (!papersResponse.data.success || !specialSessionsResponse.data.success) {
        const errorMessage = papersResponse.data.message || specialSessionsResponse.data.message || 'Failed to fetch data';
        setError(errorMessage);
        return;
      }

      const papersByDomain = papersResponse.data.data;
      const specialSessions = specialSessionsResponse.data.data;
      
      // Convert special sessions to Paper format
      const formattedSpecialSessions = Array.isArray(specialSessions) 
        ? specialSessions.map(session => ({
            ...session,
            isSpecialSession: true,
            paperId: `SS-${session._id}`,
            domain: 'Special Sessions',
            selectedSlot: {
              date: session.date || '',
              room: session.room || '',
              timeSlot: session.session
            }
          }))
        : [];
      
      // Combine papers and special sessions
      const allPapers: Paper[] = [];
      if (Array.isArray(papersByDomain)) {
        allPapers.push(...papersByDomain);
      } else if (typeof papersByDomain === 'object' && papersByDomain !== null) {
        Object.values(papersByDomain).forEach(papers => {
          if (Array.isArray(papers)) {
            allPapers.push(...papers);
          }
        });
      }
      allPapers.push(...formattedSpecialSessions);
      
      setPapers(allPapers);
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
    setUserType('none');
  };

  const isDateDisabled = (date: Date) => {
    return !ALLOWED_DATES.includes(format(date, 'yyyy-MM-dd'));
  };

  const filteredPapers = papers.filter(paper => {
    // First filter out duplicate special sessions
    if (paper.isSpecialSession && papers.some(p =>
      p.isSpecialSession &&
      p._id !== paper._id &&
      p.title === paper.title &&
      p.room === paper.room &&
      p.startTime &&
      !paper.startTime
    )) {
      return false;
    }
  
    // Apply domain filter
    const domainMatch = selectedDomain === 'All' || paper.domain === selectedDomain;
    
    // Apply search filter if search query exists
    if (searchQuery.trim() === '') {
      return domainMatch;
    }
    
    const query = searchQuery.toLowerCase().trim();
    
    // Filter based on selected search criteria
    switch (searchCriteria) {
      case 'paperId':
        return domainMatch && paper.paperId?.toLowerCase().includes(query);
      case 'title':
        return domainMatch && paper.title?.toLowerCase().includes(query);
      case 'presenter':
        if (paper.isSpecialSession) {
          return domainMatch && paper.speaker?.toLowerCase().includes(query);
        } else {
          return domainMatch && paper.presenters?.some(p => 
            p.name.toLowerCase().includes(query)
          );
        }
      case 'default':
      default:
        // Return all items when "default" is selected without filtering
        return domainMatch;
    }
  });
  
  const groupedByDomain = filteredPapers.reduce((acc, paper) => {
    if (!paper.selectedSlot) return acc;
    
    // Handle domain properly, using 'Special Sessions' for special sessions and 'Other' for undefined
    const domain = paper.isSpecialSession 
        ? 'Special Sessions'
        : paper.domain || 'Other';
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

  const getStatusColor = (status: Paper['presentationStatus']) => {
    switch (status) {
      case 'Presented':
        return theme.palette.success.main;
      case 'In Progress':
        return theme.palette.warning.main;
      case 'Cancelled':
        return theme.palette.error.main;
      default:
        return theme.palette.info.main;
    }
  };

  const getStatusBgColor = (status: Paper['presentationStatus']) => {
    switch (status) {
      case 'Presented':
        return alpha(theme.palette.success.main, 0.05);
      case 'In Progress':
        return alpha(theme.palette.warning.main, 0.05);
      case 'Cancelled':
        return alpha(theme.palette.error.main, 0.05);
      default:
        return alpha(theme.palette.info.main, 0.05);
    }
  };

  const getStatusBgHoverColor = (status: Paper['presentationStatus']) => {
    switch (status) {
      case 'Presented':
        return alpha(theme.palette.success.main, 0.08);
      case 'In Progress':
        return alpha(theme.palette.warning.main, 0.08);
      case 'Cancelled':
        return alpha(theme.palette.error.main, 0.08);
      default:
        return alpha(theme.palette.info.main, 0.08);
    }
  };

  const getStatusIcon = (status: Paper['presentationStatus']) => {
    switch (status) {
      case 'Presented':
        return <CheckCircleIcon />;
      case 'In Progress':
        return <PlayArrowIcon />;
      case 'Cancelled':
        return <CancelIcon />;
      default:
        return <ScheduleIcon />;
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Conference Timetable
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <NotificationBell />
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
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Search Criteria</InputLabel>
              <Select
                value={searchCriteria}
                label="Search Criteria"
                onChange={(e) => setSearchCriteria(e.target.value as SearchCriteria)}
                sx={{ mb: 1 }}
              >
                <MenuItem value="default">Default</MenuItem>
                <MenuItem value="paperId">Paper ID</MenuItem>
                <MenuItem value="title">Paper Title</MenuItem>
                <MenuItem value="presenter">Presenter Name</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              placeholder={`Search by ${searchCriteria === 'default' ? 'all criteria' : searchCriteria}...`}
              size="small"
            />
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
              <AccordionDetails sx={{ p: 2 }}>
                {Object.entries(rooms).map(([room, roomPapers]) => (
                  <Accordion
                    key={`${domain}-${room}`}
                    expanded={expandedRooms[`${domain}-${room}`] || false}
                    onChange={handleRoomChange(`${domain}-${room}`)}
                    sx={{
                      mb: 2,
                      '&:before': { display: 'none' },
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: 1,
                      borderColor: 'divider'
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08)
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <RoomIcon color="primary" />
                        <Typography variant="h6">
                          {room}
                        </Typography>
                        <Chip 
                          label={`${roomPapers.length} Presentations`} 
                          size="small" 
                          sx={{ ml: 2 }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 2 }}>
                      <TableContainer>
                        <Table size="medium" aria-label="presentation schedule">
                          <TableHead>
                            <TableRow>
                              <StyledTableCell>Session</StyledTableCell>
                              <StyledTableCell>Paper ID</StyledTableCell>
                              <StyledTableCell>Title</StyledTableCell>
                              <StyledTableCell>Presenters</StyledTableCell>
                              <StyledTableCell>Status</StyledTableCell>
                              <StyledTableCell align="right">Actions</StyledTableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {roomPapers
                              .sort((a, b) => (a.selectedSlot?.session || '').localeCompare(b.selectedSlot?.session || ''))
                              .map((paper) => (
                                <StyledTableRow key={paper._id}>
                                  <StyledTableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {paper.isSpecialSession ? (
                                        <>
                                          <ScheduleIcon fontSize="small" color="action" />
                                          {paper.startTime} - {paper.endTime}
                                          <Chip
                                            size="small"
                                            label={paper.sessionType}
                                            color="secondary"
                                            sx={{ ml: 1 }}
                                          />
                                        </>
                                      ) : (
                                        paper.selectedSlot?.session && (
                                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                            {paper.selectedSlot.session}
                                          </Typography>
                                        )
                                      )}
                                    </Box>
                                  </StyledTableCell>
                                  <StyledTableCell>{paper.paperId}</StyledTableCell>
                                  <StyledTableCell>
                                    <Typography variant="body2">
                                      {paper.title}
                                    </Typography>
                                    {paper.isSpecialSession && paper.description && (
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        {paper.description}
                                      </Typography>
                                    )}
                                  </StyledTableCell>
                                  <StyledTableCell>
                                    {paper.isSpecialSession ? (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <PersonIcon fontSize="small" color="action" />
                                        {paper.speaker}
                                      </Box>
                                    ) : (
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {paper.presenters.map((presenter, index) => (
                                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <PersonIcon fontSize="small" color="action" />
                                            {presenter.name}
                                          </Box>
                                        ))}
                                      </Box>
                                    )}
                                  </StyledTableCell>
                                  <StyledTableCell>
                                    {!paper.isSpecialSession && (
                                      <Chip
                                        label={paper.presentationStatus}
                                        size="small"
                                        sx={{
                                          color: getStatusColor(paper.presentationStatus),
                                          bgcolor: getStatusBgColor(paper.presentationStatus),
                                          '&:hover': {
                                            bgcolor: getStatusBgHoverColor(paper.presentationStatus)
                                          }
                                        }}
                                      />
                                    )}
                                  </StyledTableCell>
                                  <StyledTableCell align="right">
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewDetails(paper);
                                      }}
                                      startIcon={<EventIcon />}
                                    >
                                      View Details
                                    </Button>
                                  </StyledTableCell>
                                </StyledTableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
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
                            label={selectedPaper.selectedSlot.session}
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
    {selectedPaper.isSpecialSession ? "Speaker" : "Presenters"}
  </Typography>

  {selectedPaper.isSpecialSession ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <PersonIcon color="action" fontSize="small" />
      <Typography>{selectedPaper.speaker || "N/A"}</Typography>
    </Box>
  ) : (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {selectedPaper.presenters?.map((presenter, index) => (
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
  )}
</Grid>


                  <Grid item xs={12}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Synopsis
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {selectedPaper.synopsis}
                    </Typography>
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