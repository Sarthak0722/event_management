import React, { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  LocalizationProvider,
  DatePicker,
  TimePicker,
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, isSameDay, startOfMonth, isAfter } from 'date-fns';
import axios from '../config/axios';

const ALLOWED_DATES = [
  new Date('2026-01-09'),
  new Date('2026-01-10'),
  new Date('2026-01-11'),
];

const SESSION_TYPES = ['keynote', 'guest', 'cultural', 'inauguration', 'other'];

const AddSession: React.FC = () => {
  const [title, setTitle] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [type, setType] = useState('');
  const [date, setDate] = useState<Date | null>(new Date('2026-01-09'));
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [endTime, setEndTime] = useState<Date | null>(new Date());
  const [room, setRoom] = useState('');
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const isDateAllowed = (day: Date) =>
    ALLOWED_DATES.some((allowedDate) => isSameDay(allowedDate, day));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    if (!title || !type || !date || !startTime || !endTime || !room) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!isAfter(endTime, startTime)) {
      setError('End time must be after start time.');
      return;
    }

    const formattedDate = format(date, 'yyyy-MM-dd');
    const formattedStart = format(startTime, 'HH:mm');
    const formattedEnd = format(endTime, 'HH:mm');

    try {
      const response = await axios.post('/special-sessions/add', {
        title,
        speaker,
        date: formattedDate,
        timeSlot: `${formattedStart} - ${formattedEnd}`,
        room,
        type,
        description,
      });

      if (response.data.success) {
        setSuccess('Session added successfully!');
        setTitle('');
        setSpeaker('');
        setDate(new Date('2026-01-09'));
        setStartTime(new Date());
        setEndTime(new Date());
        setRoom('');
        setType('');
        setDescription('');
      } else {
        setError(response.data.message || 'Failed to add session.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error adding session');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Add Special Session
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
            label="Speaker (optional)"
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            select
            label="Session Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            margin="normal"
            required
          >
            {SESSION_TYPES.map((sessionType) => (
              <MenuItem key={sessionType} value={sessionType}>
                {sessionType.charAt(0).toUpperCase() + sessionType.slice(1)}
              </MenuItem>
            ))}
          </TextField>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Select Date"
              value={date}
              onChange={(newValue) => setDate(newValue)}
              shouldDisableDate={(day) => !isDateAllowed(day)}
              openTo="day"
              views={['year', 'month', 'day']}
              defaultCalendarMonth={startOfMonth(new Date('2026-01-01'))}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'normal',
                  required: true,
                },
              }}
            />
            <TimePicker
              label="Start Time"
              value={startTime}
              onChange={(newValue) => setStartTime(newValue)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'normal',
                  required: true,
                },
              }}
            />
            <TimePicker
              label="End Time"
              value={endTime}
              onChange={(newValue) => setEndTime(newValue)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'normal',
                  required: true,
                },
              }}
            />
          </LocalizationProvider>

          <TextField
            fullWidth
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            multiline
            rows={3}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            fullWidth
          >
            Add Session
          </Button>
        </form>

        <Snackbar
          open={!!success}
          autoHideDuration={3000}
          onClose={() => setSuccess('')}
        >
          <Alert severity="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        </Snackbar>
        <Snackbar
          open={!!error}
          autoHideDuration={3000}
          onClose={() => setError('')}
        >
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default AddSession;
