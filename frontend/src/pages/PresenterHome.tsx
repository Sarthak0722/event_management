import React, { useState, useEffect } from 'react';
import { Box, Container, Grid, Card, CardContent, Typography, Chip, Button, CircularProgress, Alert, CardActions } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import axios from '../config/axios';
import {
  Visibility,
  Room,
  Schedule,
  Event,
  Domain
} from '@mui/icons-material';
import PaperDetails from '../components/PaperDetails';
import { Paper } from '../types/paper';
import { useAuth } from '../context/AuthContext';

const PresenterHome: React.FC = () => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [openPaperDetails, setOpenPaperDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const theme = useTheme();

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const response = await axios.get('/papers/presenter', {
          params: { email: user?.email }
        });
        
        if (response.data.success) {
          setPapers(response.data.data);
        } else {
          setError(response.data.message || 'Failed to fetch papers');
        }
      } catch (err: any) {
        setError('Failed to fetch papers');
        console.error('Error fetching papers:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) {
      fetchPapers();
    }
  }, [user?.email]);

  const handleViewDetails = (paper: Paper) => {
    setSelectedPaper(paper);
    setOpenPaperDetails(true);
  };

  const handleClosePaperDetails = () => {
    setOpenPaperDetails(false);
    setSelectedPaper(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (papers.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No papers found for your email address.
      </Alert>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Your Papers
      </Typography>
      <Grid container spacing={3}>
        {papers.map((paper) => (
          <Grid item xs={12} md={6} key={paper._id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {paper.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<Domain />}
                    label={paper.domain}
                    size="small"
                    color="primary"
                  />
                  {paper.selectedSlot && (
                    <>
                      <Chip
                        icon={<Event />}
                        label={new Date(paper.selectedSlot.date).toLocaleDateString()}
                        size="small"
                      />
                      <Chip
                        icon={<Room />}
                        label={paper.selectedSlot.room}
                        size="small"
                      />
                      <Chip
                        icon={<Schedule />}
                        label={paper.selectedSlot.timeSlot}
                        size="small"
                      />
                    </>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {paper.synopsis.substring(0, 200)}...
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  startIcon={<Visibility />}
                  onClick={() => handleViewDetails(paper)}
                >
                  View Details
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      {selectedPaper && (
        <PaperDetails
          paper={selectedPaper}
          open={openPaperDetails}
          onClose={handleClosePaperDetails}
        />
      )}
    </Container>
  );
};

export default PresenterHome; 