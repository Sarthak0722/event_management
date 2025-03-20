import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Button,
  Paper as MuiPaper,
  Typography,
  Collapse
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

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
  room: number | null;
  isSlotAllocated: boolean;
  presentationDate?: Date;
}

interface RoomProps {
  roomNumber: number;
  papers: Paper[];
  onViewDetails: (paper: Paper) => void;
  expanded: boolean;
  onToggle: () => void;
}

const Room: React.FC<RoomProps> = ({ roomNumber, papers, onViewDetails, expanded, onToggle }) => {
  return (
    <Box sx={{ mb: 2 }}>
      <Button
        onClick={onToggle}
        fullWidth
        sx={{
          justifyContent: 'space-between',
          backgroundColor: '#f0f7ff',
          color: 'black',
          '&:hover': {
            backgroundColor: '#e3f2fd'
          },
          mb: 1
        }}
      >
        <Typography variant="h6">Room {roomNumber}</Typography>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Button>
      <Collapse in={expanded}>
        <TableContainer component={MuiPaper} variant="outlined">
          <Table>
            <TableBody>
              {papers.map((paper) => (
                <TableRow key={paper._id}>
                  <TableCell sx={{ width: '150px' }}>{paper.timeSlot}</TableCell>
                  <TableCell sx={{ width: '100px' }}>{paper.teamId}</TableCell>
                  <TableCell>
                    {paper.presenters.map(p => p.name).join(', ')}
                  </TableCell>
                  <TableCell>{paper.title}</TableCell>
                  <TableCell sx={{ width: '120px' }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => onViewDetails(paper)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Box>
  );
};

export default Room; 