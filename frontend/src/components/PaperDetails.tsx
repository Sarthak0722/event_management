import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Event as EventIcon,
  Room as RoomIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Domain as DomainIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

interface Presenter {
  name: string;
  email: string;
  phone: string;
}

interface Paper {
  _id: string;
  title: string;
  domain: string;
  paperId: string;
  synopsis: string;
  presenters: Presenter[];
  selectedSlot?: {
    date: string;
    room: string;
    session: string;
    bookedBy?: string;
  };
  presentationStatus?: 'Scheduled' | 'In Progress' | 'Presented' | 'Cancelled';
}

interface SpecialSession {
  _id: string;
  title: string;
  speaker: string;
  room: string;
  sessionType: 'Guest Lecture' | 'Keynote Speech' | 'Cultural Event' | 'Workshop';
  date: string;
  startTime: string;
  endTime: string;
  session: 'Session 1' | 'Session 2';
  description?: string;
}

interface Event {
  isSpecialSession: boolean;
  eventType: 'presentation' | 'special';
  _id: string;
  title: string;
  room: string;
  session: string;
  startTime?: string;
  endTime?: string;
  speaker?: string;
  sessionType?: string;
  description?: string;
  date?: string;
  selectedSlot?: {
    date: string;
    room: string;
    session: string;
    bookedBy?: string;
  };
  presenters?: Presenter[];
  presentationStatus?: 'Scheduled' | 'In Progress' | 'Presented' | 'Cancelled';
  domain?: string;
  paperId?: string;
  synopsis?: string;
}

interface PaperDetailsProps {
  paper: Paper | Event | null;
  open: boolean;
  onClose: () => void;
}

const PaperDetails: React.FC<PaperDetailsProps> = ({ paper, open, onClose }) => {
  const theme = useTheme();

  if (!paper) return null;

  const isEvent = 'isSpecialSession' in paper;
  const event = isEvent ? paper as Event : null;
  const regularPaper = !isEvent ? paper as Paper : null;

  if (!event && !regularPaper) return null;

  const getStatusColor = (status: string) => {
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

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Date not set';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return format(date, 'dd MMM yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventIcon color="primary" />
          <Typography variant="h6">
            {isEvent ? 'Special Session Details' : 'Paper Details'}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            {paper.title}
          </Typography>
          
          {!isEvent && regularPaper && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                icon={<DomainIcon />}
                label={regularPaper.domain}
                color="primary"
              />
              <Chip
                size="small"
                icon={<EventIcon />}
                label={`Paper ID: ${regularPaper.paperId}`}
                color="secondary"
              />
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {isEvent && event ? (
              <Chip
                size="small"
                label={event.sessionType}
                color="secondary"
              />
            ) : regularPaper ? (
              <Chip
                size="small"
                label={regularPaper.presentationStatus}
                color="primary"
                sx={{
                  color: getStatusColor(regularPaper.presentationStatus || 'Scheduled'),
                }}
              />
            ) : null}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Schedule
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                icon={<EventIcon />}
                label={formatDate(isEvent && event ? event.date : regularPaper?.selectedSlot?.date)}
                variant="outlined"
              />
              <Chip
                size="small"
                icon={<RoomIcon />}
                label={`Room ${isEvent && event ? event.room : regularPaper?.selectedSlot?.room || 'Not assigned'}`}
                variant="outlined"
              />
              <Chip
                size="small"
                icon={<ScheduleIcon />}
                label={isEvent && event
                  ? `${event.startTime || 'TBD'} - ${event.endTime || 'TBD'}`
                  : regularPaper?.selectedSlot?.session === 'Session 1'
                    ? 'Session 1 (9:00 AM - 12:00 PM)'
                    : regularPaper?.selectedSlot?.session === 'Session 2'
                    ? 'Session 2 (1:00 PM - 4:00 PM)'
                    : 'Session not assigned'}
                variant="outlined"
              />
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {isEvent ? 'Speaker' : 'Presenters'}
            </Typography>
            {isEvent && event ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2">{event.speaker}</Typography>
              </Box>
            ) : regularPaper ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {regularPaper.presenters.map((presenter, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Box>
                      <Typography variant="body2">{presenter.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {presenter.email}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>

          {(isEvent && event ? event.description : regularPaper?.synopsis) && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {isEvent ? 'Description' : 'Synopsis'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isEvent && event ? event.description : regularPaper?.synopsis}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaperDetails; 