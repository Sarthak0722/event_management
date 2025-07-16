import React, { useEffect, useState } from 'react';
import {
  Typography,
  Container,
  CircularProgress,
  Alert,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper
} from '@mui/material';
import axios from '../config/axios';

interface PaperData {
  title: string;
  domain: string;
  paperId: string;
  room: string;
  session: string;
  date: string;
  presenters: string;
}

const TimetablePage: React.FC = () => {
  const [data, setData] = useState<Record<string, PaperData[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const res = await axios.get('/papers/schedule');
        const papers: PaperData[] = res.data.data;

        const grouped: Record<string, PaperData[]> = {};

        // Group by domain
        papers.forEach(paper => {
          if (!grouped[paper.domain]) grouped[paper.domain] = [];
          grouped[paper.domain].push(paper);
        });

        // Sort each domain’s papers
        for (const domain in grouped) {
          grouped[domain].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateA - dateB;

            const roomA = parseInt(a.room.replace(/\D/g, ''), 10);
            const roomB = parseInt(b.room.replace(/\D/g, ''), 10);
            if (roomA !== roomB) return roomA - roomB;

            const sessionA = a.session.includes('1') ? 1 : 2;
            const sessionB = b.session.includes('1') ? 1 : 2;
            return sessionA - sessionB;
          });
        }

        setData(grouped);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch schedule');
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, []);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Conference Timetable
      </Typography>

      {loading && <Box textAlign="center"><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && Object.keys(data).length === 0 && (
        <Typography align="center">No schedule data available.</Typography>
      )}

      {!loading && !error && (
        <>
          {Object.entries(data).map(([domain, papers]) => (
            <Box key={domain} sx={{ mb: 6 }}>
              <Typography variant="h5" color="primary" gutterBottom>
                Track: {domain}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Note:</strong> Session 1 → 09:00 AM – 12:00 PM | Session 2 → 01:00 PM – 04:00 PM
              </Typography>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Room</strong></TableCell>
                      <TableCell><strong>Session</strong></TableCell>
                      <TableCell><strong>Paper ID</strong></TableCell>
                      <TableCell><strong>Title</strong></TableCell>
                      <TableCell><strong>Presenters</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      let lastDate = '';
                      let lastRoom = '';
                      return papers.flatMap((paper, idx) => {
                        const rows: JSX.Element[] = [];

                        const formattedDate = new Date(paper.date).toLocaleDateString();

                        if (formattedDate !== lastDate) {
                          lastDate = formattedDate;
                          lastRoom = '';
                          rows.push(
                            <TableRow key={`date-${idx}`}>
                              <TableCell colSpan={6} sx={{ backgroundColor: '#e0f7fa' }}>
                                <strong>Date: {formattedDate}</strong>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        if (paper.room !== lastRoom) {
                          lastRoom = paper.room;
                          rows.push(
                            <TableRow key={`room-${idx}`}>
                              <TableCell colSpan={6} sx={{ backgroundColor: '#f0f0f0' }}>
                                <strong>Room: {paper.room}</strong>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        rows.push(
                          <TableRow key={paper.paperId}>
                            <TableCell>{formattedDate}</TableCell>
                            <TableCell>{paper.room}</TableCell>
                            <TableCell>{paper.session}</TableCell>
                            <TableCell>{paper.paperId}</TableCell>
                            <TableCell>{paper.title}</TableCell>
                            <TableCell>{paper.presenters}</TableCell>
                          </TableRow>
                        );

                        return rows;
                      });
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))}
        </>
      )}
    </Container>
  );
};

export default TimetablePage;
