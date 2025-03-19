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
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Room from '../components/Room';
import PaperDetails from '../components/PaperDetails';

interface Presenter {
  name: string;
  email: string;
  contact: string;
}

interface Paper {
  _id: string;
  domain: string;
  teamId: string;
  title: string;
  presenters: Presenter[];
  synopsis: string;
  day: number;
  timeSlot: string;
  room: number;
}

interface PapersByDomain {
  [key: string]: Paper[];
}

const AttendeeHome = () => {
  const { user, logout } = useAuth();
  const [papers, setPapers] = useState<PapersByDomain>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [expandedRooms, setExpandedRooms] = useState<{ [key: string]: boolean }>({});
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('/api/papers');
        if (response.data.success) {
          setPapers(response.data.data);
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
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filteredPapers: PapersByDomain = {};

    Object.entries(papers).forEach(([domain, domainPapers]) => {
      if (selectedDomain !== 'All' && domain !== selectedDomain) {
        return;
      }

      const filtered = domainPapers.filter(paper =>
        paper.title.toLowerCase().includes(searchTermLower) ||
        paper.synopsis.toLowerCase().includes(searchTermLower) ||
        paper.presenters.some(presenter =>
          presenter.name.toLowerCase().includes(searchTermLower) ||
          presenter.email.toLowerCase().includes(searchTermLower)
        )
      );

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
      if (!acc[paper.room]) {
        acc[paper.room] = [];
      }
      acc[paper.room].push(paper);
      return acc;
    }, {} as { [key: number]: Paper[] });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography>Loading conference schedule...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Conference Schedule
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Domain</InputLabel>
          <Select
            value={selectedDomain}
            label="Domain"
            onChange={(e) => setSelectedDomain(e.target.value)}
          >
            <MenuItem value="All">All</MenuItem>
            {Object.keys(papers).map((domain) => (
              <MenuItem key={domain} value={domain}>
                {domain}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={handleSearch}>
          Search
        </Button>
      </Box>

      {Object.entries(papers).length === 0 ? (
        <Typography>No papers found in the schedule.</Typography>
      ) : (
        Object.entries(papers).map(([domain, domainPapers]) => (
          <Accordion key={domain} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">{domain}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {Object.entries(groupPapersByRoom(domainPapers)).map(([roomNumber, roomPapers]) => (
                <Room
                  key={`${domain}-${roomNumber}`}
                  roomNumber={parseInt(roomNumber)}
                  papers={roomPapers}
                  onViewDetails={handleViewDetails}
                  expanded={expandedRooms[`${domain}-${roomNumber}`] || false}
                  onToggle={() => handleRoomToggle(domain, parseInt(roomNumber))}
                />
              ))}
            </AccordionDetails>
          </Accordion>
        ))
      )}

      <PaperDetails
        paper={selectedPaper}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
    </Container>
  );
};

export default AttendeeHome; 