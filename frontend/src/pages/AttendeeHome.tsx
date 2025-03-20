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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Paper,
  Chip,
  IconButton,
  InputAdornment,
  Divider,
  Grid,
  Card,
  CardContent,
  useTheme,
  Tab,
  Tabs,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Event as EventIcon,
  Room as RoomIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import Room from '../components/Room';
import PaperDetails from '../components/PaperDetails';

interface Presenter {
  name: string;
  email: string;
  contact: string;
  hasSelectedSlot: boolean;
}

interface Paper {
  _id: string;
  domain: string;
  teamId: string;
  title: string;
  presenters: Presenter[];
  synopsis: string;
  day: number | null;
  timeSlot: string | null;
  room: number | null;
  isSlotAllocated: boolean;
  presentationDate?: Date;
}

interface PapersByDomain {
  [key: string]: Paper[];
}

type SearchType = 'default' | 'presenter' | 'teamId' | 'title';

const AttendeeHome = () => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const [papers, setPapers] = useState<PapersByDomain>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('default');
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [expandedRooms, setExpandedRooms] = useState<{ [key: string]: boolean }>({});
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [originalPapers, setOriginalPapers] = useState<PapersByDomain>({});

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('/api/papers');
        if (response.data.success) {
          const papersByDomain: PapersByDomain = {};
          Object.entries(response.data.data as Record<string, any[]>).forEach(([domain, domainPapers]) => {
            const allocatedPapers = domainPapers.filter(paper => paper.isSlotAllocated) as Paper[];
            if (allocatedPapers.length > 0) {
              papersByDomain[domain] = allocatedPapers;
            }
          });
          setPapers(papersByDomain);
          setOriginalPapers(papersByDomain);
        } else {
          setError('Failed to fetch papers');
        }
      } catch (err) {
        console.error('Error fetching papers:', err);
        setError('Failed to load conference papers. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPapers();
  }, []);

  const handleRoomToggle = (domain: string, roomNumber: number) => {
    const key = `${domain}-${roomNumber}`;
    setExpandedRooms(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleViewDetails = (paper: Paper) => {
    setSelectedPaper(paper);
    setDetailsOpen(true);
  };

  const handleSearch = () => {
    if (!searchTerm.trim() && selectedDomain === 'All') {
      setPapers(originalPapers);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filteredPapers: PapersByDomain = {};

    Object.entries(originalPapers).forEach(([domain, domainPapers]) => {
      if (selectedDomain !== 'All' && domain !== selectedDomain) {
        return;
      }

      const filtered = domainPapers.filter(paper => {
        switch (searchType) {
          case 'presenter':
            return paper.presenters.some(presenter =>
              presenter.name.toLowerCase().includes(searchTermLower) ||
              presenter.email.toLowerCase().includes(searchTermLower)
            );
          case 'teamId':
            return paper.teamId.toLowerCase().includes(searchTermLower);
          case 'title':
            return paper.title.toLowerCase().includes(searchTermLower);
          default:
            return (
              paper.title.toLowerCase().includes(searchTermLower) ||
              paper.synopsis.toLowerCase().includes(searchTermLower) ||
              paper.presenters.some(presenter =>
                presenter.name.toLowerCase().includes(searchTermLower) ||
                presenter.email.toLowerCase().includes(searchTermLower)
              ) ||
              paper.teamId.toLowerCase().includes(searchTermLower)
            );
        }
      });

      if (filtered.length > 0) {
        filteredPapers[domain] = filtered;
      }
    });

    setPapers(filteredPapers);
  };

  const handleLogout = () => {
    logout();
  };

  const groupPapersByRoom = (domainPapers: Paper[]) => {
    return domainPapers.reduce((acc, paper) => {
      if (paper.room !== null) {
        if (!acc[paper.room]) {
          acc[paper.room] = [];
        }
        acc[paper.room].push(paper);
      }
      return acc;
    }, {} as { [key: number]: Paper[] });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="textSecondary">Loading conference schedule...</Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Conference Schedule
          </Typography>
          <IconButton onClick={handleLogout} color="inherit" title="Logout">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Search By</InputLabel>
                <Select
                  value={searchType}
                  label="Search By"
                  onChange={(e) => setSearchType(e.target.value as SearchType)}
                >
                  <MenuItem value="default">All Fields</MenuItem>
                  <MenuItem value="presenter">Presenter</MenuItem>
                  <MenuItem value="teamId">Paper ID</MenuItem>
                  <MenuItem value="title">Title</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleSearch} edge="end">
                        <SearchIcon />
                      </IconButton>
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
                  {Object.keys(originalPapers).map((domain) => (
                    <MenuItem key={domain} value={domain}>
                      {domain}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {Object.keys(papers).length === 0 ? (
          <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              No scheduled presentations available yet.
            </Typography>
            <Typography color="textSecondary">
              Please check back later when presenters have selected their slots.
            </Typography>
          </Paper>
        ) : (
          Object.entries(papers).map(([domain, domainPapers]) => (
            <Paper elevation={2} sx={{ mb: 2 }} key={domain}>
              <Accordion defaultExpanded>
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText
                  }}
                >
                  <Typography variant="h6">{domain}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {Object.entries(groupPapersByRoom(domainPapers)).map(([roomNumber, roomPapers]) => (
                      <Grid item xs={12} key={`${domain}-${roomNumber}`}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <RoomIcon sx={{ mr: 1 }} />
                              <Typography variant="h6">Room {roomNumber}</Typography>
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            {roomPapers.map((paper) => (
                              <Box key={paper._id} sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                  {paper.title}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                  <Chip
                                    size="small"
                                    icon={<ScheduleIcon />}
                                    label={paper.timeSlot || 'No time slot'}
                                  />
                                  <Chip
                                    size="small"
                                    icon={<PersonIcon />}
                                    label={paper.presenters[0]?.name || 'No presenter'}
                                  />
                                  <Chip
                                    size="small"
                                    label={`ID: ${paper.teamId}`}
                                  />
                                </Box>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleViewDetails(paper)}
                                >
                                  View Details
                                </Button>
                              </Box>
                            ))}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Paper>
          ))
        )}

        <PaperDetails
          paper={selectedPaper}
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
        />
      </Container>
    </Box>
  );
};

export default AttendeeHome;