import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper as MuiPaper,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import axios from '../config/axios';

type DraggableProvidedType = {
  draggableProps: any;
  dragHandleProps: any | null;
  innerRef: (element: HTMLElement | null) => void;
};

type DroppableProvidedType = {
  droppableProps: any;
  innerRef: (element: HTMLElement | null) => void;
  placeholder?: React.ReactNode;
};

type DropResultType = {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination?: {
    droppableId: string;
    index: number;
  } | null;
  reason?: 'DROP' | 'CANCEL';
};

interface ConferencePaper {
  _id: string;
  title: string;
  presenters: string[];
  domain: string;
  selectedTimeSlot?: string;
  room?: string;
}

interface TimeSlot {
  id: string;
  time: string;
  room: string;
  paperId?: string;
}

const ScheduleManager: React.FC = () => {
  const [papers, setPapers] = useState<ConferencePaper[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  useEffect(() => {
    fetchPapersAndTimeSlots();
  }, []);

  const fetchPapersAndTimeSlots = async () => {
    try {
      const [papersRes, timeSlotsRes] = await Promise.all([
        axios.get('/api/papers'),
        axios.get('/api/time-slots'),
      ]);
      setPapers(papersRes.data);
      setTimeSlots(timeSlotsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleDragEnd = async (result: DropResultType) => {
    if (!result.destination) return;

    const { destination, draggableId } = result;
    
    // Check for scheduling conflicts
    const conflicts = await checkConflicts(draggableId, destination.droppableId);
    
    if (conflicts.length > 0) {
      setConflicts(conflicts);
      setShowConflictDialog(true);
      return;
    }

    // Update paper schedule
    try {
      await axios.patch(`/api/papers/${draggableId}/schedule`, {
        timeSlotId: destination.droppableId,
      });
      
      // Refresh data
      fetchPapersAndTimeSlots();
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  const checkConflicts = async (paperId: string, timeSlotId: string) => {
    try {
      const response = await axios.post('/api/schedule/check-conflicts', {
        paperId,
        timeSlotId,
      });
      return response.data.conflicts;
    } catch (error) {
      console.error('Error checking conflicts:', error);
      return [];
    }
  };

  const handleBulkAssignment = async () => {
    try {
      await axios.post('/api/schedule/bulk-assign');
      fetchPapersAndTimeSlots();
    } catch (error) {
      console.error('Error in bulk assignment:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Schedule Manager
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleBulkAssignment}
          sx={{ mr: 2 }}
        >
          Auto-Assign All Papers
        </Button>
      </Box>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={3}>
          {/* Unassigned Papers */}
          <Grid item xs={12} md={4}>
            <MuiPaper sx={{ p: 2, height: '70vh', overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                Unassigned Papers
              </Typography>
              <Droppable droppableId="unassigned">
                {(provided: DroppableProvidedType) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {papers
                      .filter((paper) => !paper.selectedTimeSlot)
                      .map((paper, index) => (
                        <Draggable
                          key={paper._id}
                          draggableId={paper._id}
                          index={index}
                        >
                          {(provided: DraggableProvidedType) => (
                            <MuiPaper
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              ref={provided.innerRef}
                              sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}
                            >
                              <Typography variant="subtitle1">
                                {paper.title}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                Domain: {paper.domain}
                              </Typography>
                            </MuiPaper>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </MuiPaper>
          </Grid>

          {/* Time Slots */}
          <Grid item xs={12} md={8}>
            <MuiPaper sx={{ p: 2, height: '70vh', overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                Schedule
              </Typography>
              <Grid container spacing={2}>
                {timeSlots.map((slot) => (
                  <Grid item xs={12} key={slot.id}>
                    <Droppable droppableId={slot.id}>
                      {(provided: DroppableProvidedType) => (
                        <MuiPaper
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          sx={{ p: 2, backgroundColor: '#f0f7ff' }}
                        >
                          <Typography variant="subtitle2">
                            {slot.time} - Room {slot.room}
                          </Typography>
                          {papers
                            .filter((p) => p.selectedTimeSlot === slot.id)
                            .map((paper, index) => (
                              <Draggable
                                key={paper._id}
                                draggableId={paper._id}
                                index={index}
                              >
                                {(provided: DraggableProvidedType) => (
                                  <MuiPaper
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    ref={provided.innerRef}
                                    sx={{ p: 2, mt: 1, backgroundColor: 'white' }}
                                  >
                                    <Typography variant="subtitle1">
                                      {paper.title}
                                    </Typography>
                                  </MuiPaper>
                                )}
                              </Draggable>
                            ))}
                          {provided.placeholder}
                        </MuiPaper>
                      )}
                    </Droppable>
                  </Grid>
                ))}
              </Grid>
            </MuiPaper>
          </Grid>
        </Grid>
      </DragDropContext>

      {/* Conflict Dialog */}
      <Dialog
        open={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
      >
        <DialogTitle>Scheduling Conflicts Detected</DialogTitle>
        <DialogContent>
          {conflicts.map((conflict, index) => (
            <Typography key={index} color="error">
              {conflict}
            </Typography>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConflictDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ScheduleManager; 