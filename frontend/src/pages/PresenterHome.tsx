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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper as MuiPaper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PaperDetails from '../components/PaperDetails';

interface Presenter {
  name: string;
  email: string;
  contact: string;
}

interface Paper {
  _id: string;
  title: string;
  domain: string;
  presenters: Presenter[];
  synopsis: string;
  room: number;
  timeSlot: string;
  teamId: string;
  day: number;
}

const PresenterHome = () => {
  const { user, logout } = useAuth();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const fetchPresenterPapers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('/api/papers');
        if (response.data.success) {
          // Filter papers where the current user is a presenter
          const allPapers = (Object.values(response.data.data) as Paper[][]).flat() as Paper[];
          const presenterPapers = allPapers.filter((paper: unknown) => {
            const p = paper as Paper;
            return p.presenters.some(
              presenter => presenter.email === user?.email
            );
          });
          setPapers(presenterPapers);
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

    fetchPresenterPapers();
  }, [user?.email]);

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
          My Presentations
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
            {Array.from(new Set(papers.map(p => p.domain))).map((domain) => (
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

      {papers.length === 0 ? (
        <Typography>No presentations found.</Typography>
      ) : (
        <TableContainer component={MuiPaper} variant="outlined">
          <Table>
            <TableBody>
              {papers.map((paper) => (
                <TableRow key={paper._id}>
                  <TableCell sx={{ width: '150px' }}>{paper.timeSlot}</TableCell>
                  <TableCell sx={{ width: '100px' }}>Room {paper.room}</TableCell>
                  <TableCell sx={{ width: '120px' }}>{paper.domain}</TableCell>
                  <TableCell>{paper.title}</TableCell>
                  <TableCell sx={{ width: '120px' }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleViewDetails(paper)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <PaperDetails
        paper={selectedPaper}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
    </Container>
  );
};

export default PresenterHome; 