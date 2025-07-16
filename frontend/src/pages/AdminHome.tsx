import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../config/axios';
import {
  Container,
  Typography,
  Box,
  Button,
  Alert,
  Paper,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  useTheme,
  alpha,
  Switch,
  FormControlLabel,
  Tooltip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  tableCellClasses,
  TextField,
  InputAdornment,
  useMediaQuery
} from '@mui/material';
import {
  Event as EventIcon,
  Room as RoomIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Logout as LogoutIcon,
  Domain as DomainIcon,
  ExpandMore as ExpandMoreIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PlayArrow as PlayArrowIcon,
  Dashboard as DashboardIcon,
  Notifications as NotificationsIcon,
  People as PeopleIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { Checkbox } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { styled, Theme } from '@mui/material/styles';
import { Link, useNavigate } from 'react-router-dom';
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
  reported?: boolean;
  isSpecialSession?: boolean;
  speaker?: string;
  sessionType?: 'Guest' | 'Keynote' | 'Cultural';
  startTime?: string;
  endTime?: string;
  date?: string;
  room?: string;
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

// Styled components for the table
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

type StatusColorType = 'success' | 'warning' | 'error' | 'info';

const getStatusColorKey = (status: Paper['presentationStatus']): StatusColorType => {
  switch (status) {
    case 'Presented':
      return 'success';
    case 'In Progress':
      return 'warning';
    case 'Cancelled':
      return 'error';
    default:
      return 'info';
  }
};

const getStatusColor = (status: Paper['presentationStatus'], theme: Theme) => {
  const colorKey = getStatusColorKey(status);
  return theme.palette[colorKey].main;
};

const getStatusBgColor = (status: Paper['presentationStatus'], theme: Theme) => {
  const colorKey = getStatusColorKey(status);
  return alpha(theme.palette[colorKey].main, 0.05);
};

const getStatusBgHoverColor = (status: Paper['presentationStatus'], theme: Theme) => {
  const colorKey = getStatusColorKey(status);
  return alpha(theme.palette[colorKey].main, 0.08);
};

const getStatusIcon = (status: Paper['presentationStatus']) => {
  switch (status) {
    case 'Presented':
      return <CheckCircleIcon color="success" />;
    case 'In Progress':
      return <PlayArrowIcon color="warning" />;
    case 'Cancelled':
      return <CancelIcon color="error" />;
    default:
      return <ScheduleIcon color="info" />;
  }
};

const AdminHome: React.FC = () => {
  const { user, setUserType } = useAuth();
  const theme = useTheme();
  const matchesXs = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(ALLOWED_DATES[0]));
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [expandedDomain, setExpandedDomain] = useState<string | false>(false);
  const [expandedRooms, setExpandedRooms] = useState<{ [key: string]: boolean }>({});
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCriteria, setSearchCriteria] = useState<'default' | 'paperId' | 'title' | 'presenter'>('default');
  const navigate = useNavigate();

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
              timeSlot: `${session.startTime} - ${session.endTime}`
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
    } catch (err: any) {
      console.error('Error fetching papers and special sessions:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load papers and special sessions. Please try again later.';
      setError(errorMessage);
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
    const domainMatch = selectedDomain === 'All' || paper.domain === selectedDomain;
    
    if (searchQuery.trim() === '') {
      return domainMatch;
    }
    
    const query = searchQuery.toLowerCase().trim();
    
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


  const handleReportedChange = async (
    paperId: string,
    value: boolean,
    setPapers: React.Dispatch<React.SetStateAction<Paper[]>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    try {
      const response = await axios.patch(`/papers/${paperId}/reported`, {
        reported: value,
      });
  
      if (response.data.success) {
        setPapers(prev =>
          prev.map(p => p._id === paperId ? { ...p, reported: value } : p)
        );
      } else {
        setError(response.data.message || 'Failed to update reported status');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error updating reported status');
    }
  };

  const handleStatusChange = async (paperId: string, newStatus: Paper['presentationStatus']) => {
    try {
      setUpdatingStatus(paperId);
      
      // Check if it's a special session (paperId starts with 'SS-')
      if (paperId.startsWith('SS-')) {
        const actualId = paperId.substring(3); // Remove 'SS-' prefix
        const response = await axios.patch(`/special-sessions/${actualId}/status`, {
          status: newStatus
        });
        
        if (response.data.success) {
          setPapers(papers.map(paper => 
            paper._id === actualId && paper.isSpecialSession
              ? { ...paper, presentationStatus: newStatus }
              : paper
          ));
        } else {
          setError(response.data.message || 'Failed to update session status');
        }
      } else {
        // Regular paper status update
        const response = await axios.patch(`/papers/${paperId}/presentation-status`, {
          presentationStatus: newStatus
        });
        
        if (response.data.success) {
          setPapers(papers.map(paper => 
            paper._id === paperId && !paper.isSpecialSession
              ? { ...paper, presentationStatus: newStatus }
              : paper
          ));
        } else {
          setError(response.data.message || 'Failed to update presentation status');
        }
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      setError(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const adminFeatures = [
    {
      title: 'Add Paper',
      description: 'Manually add a paper to the database',
      icon: <AssignmentIcon />,
      path: '/admin/add-paper',
    },
    {
      title: 'Add Special Session',
      description: 'Schedule a guest, keynote, or cultural session',
      icon: <EventIcon />,
      path: '/admin/add-special-session',
    },
    {
      title: 'Analytics Dashboard',
      description: 'View conference statistics and metrics',
      icon: <DashboardIcon />,
      path: '/admin/dashboard',
    },
    {
      title: 'Slot Allocations',
      description: 'View and manage slot bookings per domain',
      icon: <ScheduleIcon />,
      path: '/admin/slot-allocation',
    }    
    /*{
      title: 'Schedule Manager',
      description: 'Manage presentation schedules and time slots',
      icon: <ScheduleIcon />,
      path: '/admin/schedule',
    },
    {
      title: 'Communication Center',
      description: 'Send notifications and manage communications',
      icon: <NotificationsIcon />,
      path: '/admin/communications',
    },
    {
      title: 'Presenter Management',
      description: 'Manage presenters and track attendance',
      icon: <PeopleIcon />,
      path: '/admin/presenters',
    },*/
  ];

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ 
          flexDirection: { xs: 'column', sm: 'row' }, 
          py: { xs: 2, sm: 0 },
          gap: { xs: 1, sm: 0 }
        }}>
          <Typography variant="h6" component="div" sx={{ 
            flexGrow: 1,
            fontSize: { xs: '1.1rem', sm: '1.25rem' }
          }}>
            Admin Dashboard
          </Typography>
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 2,
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'space-between', sm: 'flex-end' }
          }}>
            <NotificationBell />
            <Typography 
              variant="body2" 
              sx={{ 
                maxWidth: { xs: 150, sm: 'none' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {user?.email}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ 
        mt: { xs: 2, sm: 4 }, 
        mb: { xs: 2, sm: 4 },
        px: { xs: 1, sm: 2, md: 3 }
      }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Admin Dashboard
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {adminFeatures.map((feature) => (
              <Grid item xs={12} sm={6} md={3} key={feature.title}>
                <Paper
                  component={Link}
                  to={feature.path}
                  sx={{
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <Box sx={{ mb: 2, color: 'primary.main' }}>{feature.icon}</Box>
                  <Typography variant="h6" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            onClick={() => navigate('/admin/add-special-session')}
            startIcon={<AddIcon />}
          >
            Add Special Session
          </Button>
        </Box>

        <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="View Schedule For"
                  value={selectedDate}
                  onChange={handleDateChange}
                  shouldDisableDate={isDateDisabled}
                  defaultCalendarMonth={new Date(ALLOWED_DATES[0])}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={8}>
              <Box sx={{ 
                display: "flex", 
                gap: 1,
                flexDirection: { xs: 'column', sm: 'row' }
              }}>
                <FormControl 
                  size="small" 
                  sx={{ 
                    minWidth: { xs: '100%', sm: 120 }
                  }}
                >
                  <InputLabel>Search By</InputLabel>
                  <Select
                    value={searchCriteria}
                    label="Search By"
                    onChange={(e) =>
                      setSearchCriteria(e.target.value as 'default' | 'paperId' | 'title' | 'presenter')
                    }
                  >
                    <MenuItem value="default">Default</MenuItem>
                    <MenuItem value="paperId">Paper ID</MenuItem>
                    <MenuItem value="title">Title</MenuItem>
                    <MenuItem value="presenter">Presenter</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  size="small"
                  label={`Search by ${
                    searchCriteria === "default"
                      ? "all criteria"
                      : searchCriteria
                  }`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
        </Paper>

        <Box sx={{ mt: 2 }}>
          {Object.entries(groupedByDomain).map(([domain, rooms]) => (
            <Accordion
              key={domain}
              expanded={expandedDomain === domain}
              onChange={handleDomainChange(domain)}
              sx={{
                mb: { xs: 1, sm: 2 },
                "&:before": { display: "none" },
                borderRadius: "8px !important",
                overflow: "hidden",
                border: 1,
                borderColor: "divider",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: theme.palette.primary.light,
                  color: "white",
                  "& .MuiAccordionSummary-expandIconWrapper": {
                    color: "white",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <DomainIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">{domain}</Typography>
                  <Chip
                    size="small"
                    label={`${Object.keys(rooms).length} Rooms`}
                    sx={{
                      ml: 2,
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                    }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                {Object.entries(rooms).map(([room, roomPapers]) => (
                  <Accordion
                    key={`${domain}-${room}`}
                    expanded={expandedRooms[`${domain}-${room}`] || false}
                    onChange={handleRoomChange(`${domain}-${room}`)}
                    sx={{
                      mb: { xs: 1, sm: 2 },
                      "&:before": { display: "none" },
                      borderRadius: 1,
                      overflow: "hidden",
                      border: 1,
                      borderColor: "divider",
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        "&:hover": {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <RoomIcon color="primary" />
                        <Typography variant="h6">{room}</Typography>
                        <Chip
                          label={`${roomPapers.length} Papers`}
                          size="small"
                          sx={{ ml: 2 }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                      <TableContainer sx={{ 
                        maxWidth: '100%',
                        overflowX: 'auto',
                        '-webkit-overflow-scrolling': 'touch',
                        '&::-webkit-scrollbar': {
                          height: 6
                        },
                        '&::-webkit-scrollbar-track': {
                          backgroundColor: 'rgba(0,0,0,0.1)'
                        },
                        '&::-webkit-scrollbar-thumb': {
                          borderRadius: 3,
                          backgroundColor: 'rgba(0,0,0,0.2)'
                        }
                      }}>
                        <Table 
                          size={matchesXs ? "small" : "medium"} 
                          aria-label="schedule"
                          sx={{
                            minWidth: { xs: 650, sm: 800 }
                          }}
                        >
                          <TableHead>
                            <TableRow>
                              <StyledTableCell>Time</StyledTableCell>
                              <StyledTableCell>Title</StyledTableCell>
                              <StyledTableCell>Paper-ID</StyledTableCell>
                              <StyledTableCell>Presenters</StyledTableCell>
                              <StyledTableCell>Reported</StyledTableCell> {/* ✅ NEW */}
                             <StyledTableCell>Mark As</StyledTableCell>
                              <StyledTableCell align="right">Actions</StyledTableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
  {roomPapers
    .sort((a, b) => {
      const timeA = a.isSpecialSession ? a.startTime : a.selectedSlot?.session;
      const timeB = b.isSpecialSession ? b.startTime : b.selectedSlot?.session;
      return (timeA || '').localeCompare(timeB || '');
    })
    .map((paper) => (
      <StyledTableRow key={paper._id}>
        <StyledTableCell>
          {paper.isSpecialSession ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon fontSize="small" color="action" />
              {paper.startTime} - {paper.endTime}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon fontSize="small" color="action" />
              {paper.selectedSlot?.session === 'Session 1' 
                ? 'Session 1 (9:00 AM - 12:00 PM)'
                : 'Session 2 (1:00 PM - 4:00 PM)'}
            </Box>
          )}
        </StyledTableCell>

        <StyledTableCell>
          <Typography variant="body2">
            {paper.title}
          </Typography>
          {paper.isSpecialSession && paper.sessionType && (
            <Chip
              size="small"
              label={paper.sessionType}
              color="secondary"
              sx={{ mt: 0.5 }}
            />
          )}
        </StyledTableCell>

        <StyledTableCell>{paper.paperId}</StyledTableCell>

        <StyledTableCell>
          {paper.isSpecialSession ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PersonIcon fontSize="small" color="action" />
              {paper.speaker}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {paper.presenters.map((presenter, index) => (
  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexDirection: 'column' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <PersonIcon fontSize="small" color="action" />
      <Typography variant="body2">{presenter.name}</Typography>
    </Box>
    <Typography variant="caption" color="text.secondary">
      {presenter.phone}
    </Typography>
  </Box>
              ))}
            </Box>
          )}
        </StyledTableCell>

        <StyledTableCell>
          {!paper.isSpecialSession && (
            <Box display="flex" alignItems="center" gap={1}>
              <Switch
                checked={!!paper.reported}
                onChange={(e) =>
                  handleReportedChange(paper._id, e.target.checked, setPapers, setError)
                }
                color="primary"
              />
              {paper.reported && (
                <Typography variant="body2" color="text.primary">
                  Reported
                </Typography>
              )}
            </Box>
          )}
        </StyledTableCell>

        <StyledTableCell>
          {!paper.isSpecialSession && (
            <FormControl size="small" fullWidth>
              <Select
                value={paper.presentationStatus}
                onChange={(e) =>
                  handleStatusChange(paper._id, e.target.value as Paper['presentationStatus'])
                }
                disabled={updatingStatus === paper._id}
              >
                <MenuItem value="Scheduled">Scheduled</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Presented">Presented</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          )}
        </StyledTableCell>

        <StyledTableCell align="right">
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleViewDetails(paper)}
            startIcon={<EventIcon />}
            fullWidth={matchesXs}
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
          ))}
        </Box>

        <Dialog
          open={detailsDialogOpen}
          onClose={handleCloseDetails}
          maxWidth="sm"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              margin: { xs: 1, sm: 2 },
              width: { xs: 'calc(100% - 16px)', sm: '100%' },
              maxHeight: { xs: 'calc(100% - 16px)', sm: '80vh' }
            }
          }}
        >
          <DialogTitle>
            <Typography variant="h6">Paper Details</Typography>
          </DialogTitle>
          <DialogContent>
            {selectedPaper && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {selectedPaper.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  ID: {selectedPaper.paperId}
                </Typography>
                {selectedPaper.isSpecialSession ? (
                  <>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Session Type
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedPaper.sessionType}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Speaker
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedPaper.speaker}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Schedule
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Room: {selectedPaper.selectedSlot?.room}
                        <br />
                        Time: {selectedPaper.startTime} - {selectedPaper.endTime}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Domain
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedPaper.domain}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Schedule
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Room: {selectedPaper.selectedSlot?.room}
                        <br />
                        Time: {selectedPaper.isSpecialSession 
                          ? `${selectedPaper.startTime} - ${selectedPaper.endTime}`
                          : selectedPaper.selectedSlot?.session === 'Session 1'
                            ? 'Session 1 (9:00 AM - 12:00 PM)'
                            : selectedPaper.selectedSlot?.session === 'Session 2'
                              ? 'Session 2 (1:00 PM - 4:00 PM)'
                              : selectedPaper.selectedSlot?.session}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Presenters
                      </Typography>
                      {selectedPaper.presenters.map((presenter, index) => (
                        <Box key={index} sx={{ mb: 1 }}>
                          <Typography variant="body2">
                            {presenter.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {presenter.email}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {selectedPaper.isSpecialSession ? 'Description' : 'Synopsis'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedPaper.isSpecialSession ? selectedPaper.synopsis : selectedPaper.synopsis}
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AdminHome; 