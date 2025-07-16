// src/components/SlotSelectionGrid.tsx
import React, { useState } from 'react';
import { Box, Grid, Paper, Typography, Button } from '@mui/material';
import { format } from 'date-fns';

interface SlotSelectionGridProps {
  allSlotData: {
    [date: string]: {
      room: string;
      slots: { session: string; isFull: boolean; disabled: boolean }[];
    }[];
  };
  onSlotSelect: (params: { date: string; room: string; session: string }) => void;
  onCancel: () => void;
  disabled?: boolean;
}

const SlotSelectionGrid: React.FC<SlotSelectionGridProps> = ({
  allSlotData,
  onSlotSelect,
  onCancel,
  disabled = false
}) => {
  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    room: string;
    session: string;
  } | null>(null);

  const handleConfirm = () => {
    if (selectedSlot) {
      onSlotSelect(selectedSlot);
    }
  };

  return (
    <Box>
      {Object.entries(allSlotData).map(([date, rooms]) => (
        <Box key={date} sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            {format(new Date(date), 'MMMM dd, yyyy')}
          </Typography>
          <Grid container spacing={2}>
            {rooms.map(({ room, slots }) => (
              <Grid item xs={12} sm={6} md={4} key={`${date}-${room}`}>
                <Paper 
                  sx={{ 
                    p: 2,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 2
                    }
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom>{room}</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {slots.map(({ session, isFull }) => {
                      const isSelected =
                        selectedSlot?.date === date &&
                        selectedSlot?.room === room &&
                        selectedSlot?.session === session;

                      return (
                        <Button
                          key={session}
                          variant={isSelected ? 'contained' : 'outlined'}
                          color={isSelected ? 'primary' : 'inherit'}
                          onClick={() => setSelectedSlot({ date, room, session })}
                          disabled={disabled || isFull}
                          size="small"
                          fullWidth
                        >
                          {session === "Session 1"
                            ? "Session 1 (9:00 AM - 12:00 PM)"
                            : "Session 2 (1:00 PM - 4:00 PM)"}
                          {isFull ? " (Unavailable)" : ""}
                        </Button>
                      );
                    })}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onCancel} disabled={disabled}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!selectedSlot || disabled}
          onClick={handleConfirm}
        >
          Confirm Slot
        </Button>
      </Box>
    </Box>
  );
};

export default SlotSelectionGrid;
