import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
  Grid,
  Paper as MuiPaper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Close as CloseIcon,
  Event as EventIcon,
  Room as RoomIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Domain as DomainIcon,
  ExpandMore as ExpandMoreIcon,
  Description as DescriptionIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { Paper } from '../types/paper';

interface PaperDetailsProps {
  paper: Paper | null;
  open: boolean;
  onClose: () => void;
}

const PaperDetails: React.FC<PaperDetailsProps> = ({ paper, open, onClose }) => {
  const theme = useTheme();
  const [expandedSection, setExpandedSection] = useState<string>('schedule');

  if (!paper) return null;

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedSection(isExpanded ? panel : '');
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 2
      }}>
        <Typography variant="h6" component="div">
          Paper Details
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              {paper.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                icon={<DomainIcon />}
                label={paper.domain}
                color="primary"
              />
              <Chip
                size="small"
                icon={<AssignmentIcon />}
                label={`Paper ID: ${paper.paperId}`}
                color="secondary"
              />
            </Box>
          </Grid>

          {paper.selectedSlot && (
            <Grid item xs={12}>
              <Accordion 
                expanded={expandedSection === 'schedule'} 
                onChange={handleChange('schedule')}
                sx={{ '&:before': { display: 'none' } }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    backgroundColor: theme.palette.primary.main,
                    color: 'white',
                    borderRadius: '4px 4px 0 0',
                    '&.Mui-expanded': {
                      borderRadius: '4px 4px 0 0',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ScheduleIcon sx={{ mr: 1 }} />
                    <Typography variant="subtitle1">Schedule Information</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<RoomIcon />}
                      label={`Room ${paper.selectedSlot.room}`}
                      variant="outlined"
                    />
                    <Chip
                      icon={<ScheduleIcon />}
                      label={paper.selectedSlot.timeSlot}
                      variant="outlined"
                    />
                    <Chip
                      icon={<EventIcon />}
                      label={new Date(paper.selectedSlot.date).toLocaleDateString()}
                      variant="outlined"
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}

          <Grid item xs={12}>
            <Accordion 
              expanded={expandedSection === 'synopsis'} 
              onChange={handleChange('synopsis')}
              sx={{ '&:before': { display: 'none' } }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  borderRadius: '4px 4px 0 0',
                  '&.Mui-expanded': {
                    borderRadius: '4px 4px 0 0',
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DescriptionIcon sx={{ mr: 1 }} />
                  <Typography variant="subtitle1">Synopsis</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  {paper.synopsis || 'No synopsis available'}
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Grid>

          <Grid item xs={12}>
            <Accordion 
              expanded={expandedSection === 'presenters'} 
              onChange={handleChange('presenters')}
              sx={{ '&:before': { display: 'none' } }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  borderRadius: '4px 4px 0 0',
                  '&.Mui-expanded': {
                    borderRadius: '4px 4px 0 0',
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ mr: 1 }} />
                  <Typography variant="subtitle1">Presenters</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {paper.presenters.map((presenter, index) => (
                    <Grid item xs={12} key={index}>
                      <MuiPaper 
                        variant="outlined" 
                        sx={{ 
                          p: 2,
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover
                          }
                        }}
                      >
                        <Typography variant="subtitle1" gutterBottom>
                          {presenter.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            icon={<EmailIcon />}
                            label={presenter.email}
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            icon={<PhoneIcon />}
                            label={presenter.phone}
                            variant="outlined"
                          />
                        </Box>
                      </MuiPaper>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default PaperDetails; 