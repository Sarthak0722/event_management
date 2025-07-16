import React from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  Card,
  CardContent,
  Button,
  useTheme
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Room as RoomIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

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
  session: string | null;
  room: string | null;
  isSlotAllocated: boolean;
  presentationDate?: Date;
  paperId: string;
}

interface RoomProps {
  roomName: string;
  papers: Paper[];
  onViewDetails: (paper: Paper) => void;
  expanded: boolean;
  onToggle: () => void;
}

const Room: React.FC<RoomProps> = ({
  roomName,
  papers,
  onViewDetails,
  expanded,
  onToggle
}) => {
  const theme = useTheme();

  // Sort papers by time slot
  const sortedPapers = [...papers].sort((a, b) => {
    if (!a.timeSlot || !b.timeSlot) return 0;
    return a.timeSlot.localeCompare(b.timeSlot);
  });

  return (
    <Accordion 
      expanded={expanded} 
      onChange={onToggle}
      sx={{
        '&:before': { display: 'none' },
        boxShadow: 'none',
        border: 1,
        borderColor: 'divider',
        borderRadius: '8px !important',
        overflow: 'hidden',
        mb: 2
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          backgroundColor: theme.palette.grey[50],
          borderBottom: expanded ? 1 : 0,
          borderColor: 'divider',
          '&:hover': {
            backgroundColor: theme.palette.grey[100]
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <RoomIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography variant="subtitle1" color="primary">
            {roomName}
          </Typography>
          <Chip
            size="small"
            label={`${papers.length} Presentations`}
            sx={{ ml: 2 }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {sortedPapers.map((paper) => (
            <Grid item xs={12} key={paper._id}>
              <Card 
                elevation={0}
                sx={{ 
                  border: 1,
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 1
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        {paper.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          icon={<ScheduleIcon />}
                          label={paper.timeSlot}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          icon={<PersonIcon />}
                          label={paper.presenters[0]?.name}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          icon={<AssignmentIcon />}
                          label={`Paper ID: ${paper.paperId}`}
                          color="secondary"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => onViewDetails(paper)}
                    >
                      View Details
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export default Room; 