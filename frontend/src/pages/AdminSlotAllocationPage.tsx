import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Card, CardContent, Grid, Button, CircularProgress
} from '@mui/material';
import axios from '../config/axios';

const AdminSlotAllocationPage = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/papers/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Error fetching stats', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerAutoSlotAssignment = async () => {
    try {
      const res = await axios.post('/papers/admin/auto-assign-slots');
      alert(res.data.message || 'Auto slot assignment completed.');
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Auto assignment failed.');
    }
  };

  const sendReminderEmails = async () => {
    try {
      const res = await axios.post('/notifications/send-slot-reminders');
      alert(res.data.message || 'Emails sent successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Email sending failed.');
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Domain-wise Slot Booking Stats
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : stats ? (
        <Grid container spacing={2}>
          {Object.entries(stats.domainCounts || {}).map(([domain, count]: any) => (
            <Grid item xs={12} sm={6} key={domain}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6">{domain}</Typography>
                  <Typography variant="body2">
                    Total Papers: {count}
                  </Typography>
                  <Typography variant="body2">
                    Booked Slots: {
                      stats.scheduledPapers?.[domain] || 0
                    }
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography>No data found</Typography>
      )}

      <Grid container spacing={2} sx={{ mt: 4 }}>
        <Grid item xs={12} sm={6}>
          <Button
            fullWidth
            variant="outlined"
            color="primary"
            onClick={sendReminderEmails}
          >
            Send Slot Reminder Emails
          </Button>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            onClick={triggerAutoSlotAssignment}
          >
            Run Auto Slot Assignment
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminSlotAllocationPage;
