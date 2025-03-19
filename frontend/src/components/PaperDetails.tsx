import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Button,
  Box
} from '@mui/material';

interface Presenter {
  name: string;
  email: string;
  contact: string;
}

interface Paper {
  _id: string;
  domain: string;
  teamId: string;
  title: string;
  presenters: Presenter[];
  synopsis: string;
  day: number;
  timeSlot: string;
}

interface PaperDetailsProps {
  paper: Paper | null;
  open: boolean;
  onClose: () => void;
}

const PaperDetails: React.FC<PaperDetailsProps> = ({ paper, open, onClose }) => {
  if (!paper) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Paper Details</DialogTitle>
      <DialogContent>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell component="th" scope="row">Domain</TableCell>
              <TableCell>{paper.domain}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">Team ID</TableCell>
              <TableCell>{paper.teamId}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">Paper Title</TableCell>
              <TableCell>{paper.title}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">Day</TableCell>
              <TableCell>Day {paper.day}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">Time Slot</TableCell>
              <TableCell>{paper.timeSlot}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">Presenters</TableCell>
              <TableCell>
                {paper.presenters.map((presenter, index) => (
                  <div key={index}>
                    {presenter.name} - {presenter.email} - {presenter.contact}
                  </div>
                ))}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">Synopsis</TableCell>
              <TableCell>{paper.synopsis}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} color="primary">
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default PaperDetails; 