import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../config/axios';
import { Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, Button, IconButton, Paper } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const USER_TYPES = [
  { value: 'admin', label: 'Admin' },
  { value: 'presenter', label: 'Presenter' },
  { value: 'attendee', label: 'Attendee' },
  { value: 'none', label: 'No User' },
];

const UserSelector: React.FC = () => {
  const { user, setUserType, setPresenterEmail } = useAuth();
  const [userType, setUserTypeLocal] = useState<string>(user?.role || 'none');
  const [presenterEmail, setPresenterEmailLocal] = useState<string>('');
  const [presenterEmails, setPresenterEmails] = useState<string[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 32, y: 72 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userType === 'presenter') {
      setLoadingEmails(true);
      axios.get('/papers/presenter-emails')
        .then(res => {
          if (res.data.success) {
            setPresenterEmails(res.data.emails);
          }
        })
        .finally(() => setLoadingEmails(false));
    }
  }, [userType]);

  const handleUserTypeChange = (e: SelectChangeEvent) => {
    const value = e.target.value as string;
    setUserTypeLocal(value);
    setPresenterEmailLocal('');
    setUserType(value as any);
  };

  const handlePresenterEmailChange = (e: SelectChangeEvent) => {
    const value = e.target.value as string;
    setPresenterEmailLocal(value);
    setPresenterEmail(value);
  };

  // Drag logic
  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    // If position.x is undefined (initial, top-right), calculate it from window width
    if (position.x === undefined && boxRef.current) {
      const boxWidth = boxRef.current.offsetWidth;
      setPosition({
        x: window.innerWidth - 20 - boxWidth,
        y: position.y,
      });
      dragStart.current = {
        x: e.clientX - (window.innerWidth - 20 - boxWidth),
        y: e.clientY - position.y,
      };
    } else {
      dragStart.current = {
        x: e.clientX - (position.x ?? 0),
        y: e.clientY - position.y,
      };
    }
    document.body.style.userSelect = 'none';
  };
  const onMouseMove = (e: MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };
  const onMouseUp = () => {
    setDragging(false);
    dragStart.current = null;
    document.body.style.userSelect = '';
  };
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    // eslint-disable-next-line
  }, [dragging]);

  if (!expanded) {
    return (
      <Box
        ref={boxRef}
        sx={{
          position: 'fixed',
          top: typeof position.y === 'number' ? position.y : 20,
          right: typeof position.x !== 'number' ? 20 : undefined,
          left: typeof position.x === 'number' ? position.x : undefined,
          zIndex: 2000,
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        onMouseDown={onMouseDown}
      >
        <Button
          variant="contained"
          size="small"
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          startIcon={<ExpandMoreIcon />}
        >
          User View
        </Button>
      </Box>
    );
  }

  return (
    <Paper
      ref={boxRef}
      sx={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 2000,
        minWidth: 320,
        maxWidth: 400,
        boxShadow: 6,
        borderRadius: 2,
        p: 2,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      elevation={6}
      onMouseDown={onMouseDown}
    >
      <Box
        sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
      >
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          Select User View:
        </Typography>
        <IconButton size="small" onClick={() => setExpanded(false)}>
          <ExpandLessIcon />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small">
          <InputLabel id="user-type-label">User Type</InputLabel>
          <Select
            labelId="user-type-label"
            value={userType}
            label="User Type"
            onChange={handleUserTypeChange}
          >
            {USER_TYPES.map(type => (
              <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {userType === 'presenter' && (
          <FormControl size="small" sx={{ minWidth: 220 }} disabled={loadingEmails}>
            <InputLabel id="presenter-email-label">Presenter Email</InputLabel>
            <Select
              labelId="presenter-email-label"
              value={presenterEmail}
              label="Presenter Email"
              onChange={handlePresenterEmailChange}
            >
              {presenterEmails.map(email => (
                <MenuItem key={email} value={email}>{email}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Button variant="outlined" size="small" onClick={() => { setUserType('none'); setUserTypeLocal('none'); setPresenterEmailLocal(''); }}>RESET</Button>
      </Box>
    </Paper>
  );
};

export default UserSelector; 