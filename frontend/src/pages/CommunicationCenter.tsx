import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import axios from '../config/axios';

interface Notification {
  _id: string;
  title: string;
  message: string;
  target: string[];
  domain?: string;
  room?: string;
  createdAt: string;
}

const CommunicationCenter: React.FC = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<string[]>([]);
  const [domain, setDomain] = useState('');
  const [room, setRoom] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);

  useEffect(() => {
    fetchNotifications();
    fetchDomains();
    fetchRooms();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchDomains = async () => {
    try {
      const response = await axios.get('/api/domains');
      setDomains(response.data);
    } catch (error) {
      console.error('Error fetching domains:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get('/api/rooms');
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/notifications', {
        title,
        message,
        target,
        domain,
        room,
      });
      
      // Clear form
      setTitle('');
      setMessage('');
      setTarget([]);
      setDomain('');
      setRoom('');
      
      // Refresh notifications
      fetchNotifications();
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleBroadcast = async () => {
    try {
      await axios.post('/api/notifications/broadcast', {
        title,
        message,
      });
      
      // Clear form
      setTitle('');
      setMessage('');
      
      // Refresh notifications
      fetchNotifications();
    } catch (error) {
      console.error('Error broadcasting message:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Notification Form */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Send Notification
            </Typography>
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                margin="normal"
                multiline
                rows={4}
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Target Audience</InputLabel>
                <Select
                  multiple
                  value={target}
                  onChange={(e) => setTarget(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="presenters">Presenters</MenuItem>
                  <MenuItem value="attendees">Attendees</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Domain (Optional)</InputLabel>
                <Select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {domains.map((d) => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Room (Optional)</InputLabel>
                <Select
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {rooms.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                >
                  Send Notification
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleBroadcast}
                >
                  Broadcast to All
                </Button>
              </Box>
            </form>
          </Paper>
        </Grid>

        {/* Notification History */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Notification History
            </Typography>
            <List>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification._id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={notification.title}
                      secondary={
                        <>
                          <Typography component="span" variant="body2">
                            {notification.message}
                          </Typography>
                          <br />
                          <Typography component="span" variant="caption" color="textSecondary">
                            Sent to: {notification.target.join(', ')}
                            {notification.domain && ` | Domain: ${notification.domain}`}
                            {notification.room && ` | Room: ${notification.room}`}
                            <br />
                            {new Date(notification.createdAt).toLocaleString()}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CommunicationCenter; 