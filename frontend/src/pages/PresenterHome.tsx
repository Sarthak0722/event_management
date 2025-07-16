import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "../config/axios";
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Paper,
  Chip,
  IconButton,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  useTheme,
  AppBar,
  Toolbar,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  tableCellClasses,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import {
  Search as SearchIcon,
  Event as EventIcon,
  Room as RoomIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Logout as LogoutIcon,
  Assignment as AssignmentIcon,
  Domain as DomainIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { toast } from 'react-toastify';
import PaperDetails from "../components/PaperDetails";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import { styled, Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { Paper as PaperType, Presenter } from "../types/paper";
import NotificationBell from "../components/NotificationBell";
import SlotSelectionGrid from '../components/SlotSelectionGrid';
import { Tabs, Tab } from "@mui/material";
import { useMediaQuery } from "@mui/material";




interface AvailableSlot {
  room: string;
  timeSlots: string[];
}

const ALLOWED_DATES = ["2026-01-09", "2026-01-10", "2026-01-11"];

type SearchCriteria = "default" | "paperId" | "title" | "presenter";

// Add styled components for the table
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
    fontWeight: 600,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: alpha(theme.palette.primary.main, 0.02),
  },
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
  // hide last border
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

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
  selectedSlot?: {
    date: string;
    room: string;
    session: string;
    bookedBy?: string;
  };
  presenters?: Array<{
    name: string;
    email: string;
    phone: string;
  }>;
  presentationStatus?: 'Scheduled' | 'In Progress' | 'Presented' | 'Cancelled';
  domain?: string;
  paperId?: string;
  synopsis?: string;
}

interface Paper {
  _id: string;
  title: string;
  domain: string;
  paperId: string;
  presenters: Array<{
    name: string;
    email: string;
    phone: string;
  }>;
  synopsis: string;
  selectedSlot?: {
    date: string;
    room: string;
    session: string;
    bookedBy?: string;
  };
  presentationStatus: "Scheduled" | "In Progress" | "Presented" | "Cancelled";
}

const PresenterHome = () => {
  const theme = useTheme();
  const matchesXs = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, setUserType } = useAuth();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedPaper, setSelectedPaper] = useState<Paper | Event | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [slotSelectionOpen, setSlotSelectionOpen] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [scheduledPapers, setScheduledPapers] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [allSlotData, setAllSlotData] = useState<{ [date: string]: any[] }>({});
  const [selectedSession, setSelectedSession] = useState("");
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>("default");
  const [expandedDomain, setExpandedDomain] = useState<string | false>(false);
  const [expandedRooms, setExpandedRooms] = useState<{[key: string]: boolean}>({});
  const [scheduleViewDate, setScheduleViewDate] = useState<Date | null>(new Date(ALLOWED_DATES[0]));
  const [activeTab, setActiveTab] = useState<"mypapers" | "schedule">("mypapers");
  const [isSlotSelecting, setIsSlotSelecting] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: "mypapers" | "schedule") => {
    setActiveTab(newValue);
  };

  useEffect(() => {
    fetchPresenterPapers();
  }, [user?.email]);

  useEffect(() => {
    if (activeTab === "schedule" && scheduleViewDate) {
      fetchScheduledPapers(scheduleViewDate);
    }
  }, [activeTab, scheduleViewDate]);

  const fetchPresenterPapers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/papers/presenter", {
        params: { email: user?.email },
      });
      if (response.data.success) {
        setPapers(response.data.data);
      } else {
        setError("Failed to fetch papers");
      }
    } catch (err) {
      console.error("Error fetching papers:", err);
      setError("Failed to load your papers. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledPapers = async (date: Date) => {
    try {
      const formattedDate = format(date, "yyyy-MM-dd");
      const response = await axios.get("/papers/by-date", {
        params: { date: formattedDate },
      });

      if (response.data.success) {
        console.log("Scheduled papers response:", response.data);
        const allEvents: Event[] = response.data.data;
        setScheduledPapers(allEvents);
      }
    } catch (error) {
      console.error("Error fetching scheduled papers:", error);
    }
  };

  const handleSlotSelect = async ({ date, room, session }: { date: string; room: string; session: string }) => {
    if (!selectedPaper || !user?.email) return;
  
    try {
      setIsSlotSelecting(true);
      setSlotError(null);
      
      const res = await axios.post("/papers/select-slot", {
        paperId: selectedPaper._id,
        date,
        room,
        session,
        presenterEmail: user.email,
      });
  
      if (res.data.success) {
        setPapers(prev =>
          prev.map(p => (p._id === selectedPaper._id ? res.data.data : p))
        );
        toast.success("Slot selected successfully!");
        handleCloseDialog();
        setSuccessMessage(`Successfully ${selectedPaper.selectedSlot ? 'changed' : 'selected'} slot for paper "${selectedPaper.title}"`);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      }
    } catch (err) {
      setSlotError("Failed to select slot. Please try again.");
      toast.error("Failed to select slot");
    } finally {
      setIsSlotSelecting(false);
    }
  };
  
  const handleViewDetails = (paper: Paper | Event) => {
    setSelectedPaper(paper);
    setDetailsOpen(true);
  };

  const fetchSlotsForAllDates = async (domain: string) => {
    const slotResults: { [date: string]: any[] } = {};
    for (const date of ALLOWED_DATES) {
      const res = await axios.get("/papers/available-slots", {
        params: {
          domain,
          date: date + "T00:00:00.000Z",
        },
      });
      if (res.data.success) {
        slotResults[date] = res.data.data.availableSlots;
      }
    }
    setAllSlotData(slotResults);
  };
  

  const handleOpenDialog = (paper: Paper | Event) => {
    if ('selectedSlot' in paper && paper.selectedSlot && paper.selectedSlot.bookedBy) {
      const presenters = 'presenters' in paper && paper.presenters ? paper.presenters : [];
      const bookedByPresenter = presenters.find(
        (p) => p.email === paper.selectedSlot?.bookedBy
      );
      if (paper.selectedSlot.bookedBy !== user?.email) {
        setError(
          `This slot has already been booked by ${
            bookedByPresenter?.name || "another presenter"
          }`
        );
        return;
      }
    }
  
    setSelectedPaper(paper);
    setSlotSelectionOpen(true);
    setError("");
    setSuccessMessage("");
  
    if (!('isSpecialSession' in paper)) {
      fetchSlotsForAllDates(paper.domain);
    }
  };
  

  const handleCloseDialog = () => {
    setSlotSelectionOpen(false);
    setSelectedPaper(null);
    setError("");
    setSuccessMessage("");
  };

 
  const fetchAvailableSlots = async (domain: string, date: Date) => {
    try {
      const formattedDate = format(date, "yyyy-MM-dd");
      const response = await axios.get("/papers/available-slots", {
        params: { domain, date: formattedDate },
      });
      if (response.data.success) {
        setAvailableSlots(response.data.data.availableSlots);
      }
    } catch (error: any) {
      setError(
        error.response?.data?.message || "Failed to fetch available slots"
      );
    }
  };

  

  

  const handleAccordionRoomChange =
    (domainRoom: string) =>
    (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedRooms((prev) => ({
        ...prev,
        [domainRoom]: isExpanded,
      }));
    };

  const isDateDisabled = (date: Date) => {
    return !ALLOWED_DATES.includes(format(date, "yyyy-MM-dd"));
  };

  

  const handleLogout = () => {
    setUserType('none');
  };

  const handleDomainChange =
    (domain: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedDomain(isExpanded ? domain : false);
    };

  const filteredScheduledPapers = scheduledPapers.filter((paper) => {
    if (activeTab !== "schedule") return false;

    const searchTermLower = searchTerm.toLowerCase().trim();

    // If search term is empty, return all papers
    if (searchTermLower === "") {
      return true;
    }
    
    // Filter based on selected search criteria
    switch (searchCriteria) {
      case "paperId":
        return paper.paperId?.toLowerCase().includes(searchTermLower) || false;
      case "title":
        return paper.title.toLowerCase().includes(searchTermLower);
      case "presenter":
        return paper.presenters?.some(
          (p) =>
            p.name.toLowerCase().includes(searchTermLower) ||
            p.email.toLowerCase().includes(searchTermLower)
        ) || (paper.speaker?.toLowerCase().includes(searchTermLower) || false);
      case "default":
      default:
        // Return all items when "default" is selected without filtering
        return true;
    }
  });

  // Filter papers by search term for the "My Papers" section
  const filteredPapers = papers.filter(paper => {
    const searchTermLower = searchTerm.toLowerCase().trim();
    
    // If search term is empty, return all papers
    if (searchTermLower === "") {
      return true;
    }
    
    // Filter based on selected search criteria
    switch (searchCriteria) {
      case "paperId":
        return paper.paperId?.toLowerCase().includes(searchTermLower) || false;
      case "title":
        return paper.title.toLowerCase().includes(searchTermLower);
      case "presenter":
        return paper.presenters.some(
          (p) => p.name.toLowerCase().includes(searchTermLower)
        );
      case "default":
      default:
        // Return all items when "default" is selected without filtering
        return true;
    }
  });

  const groupedByDomain = filteredScheduledPapers.reduce((acc, paper) => {
    if (!paper.selectedSlot) return acc;

    // Handle domain properly, using 'Special Sessions' for special sessions and 'Other' for undefined
    const domain = paper.isSpecialSession 
        ? 'Special Sessions'
        : paper.domain || 'Other';
    const room = paper.selectedSlot.room;

    if (!acc[domain]) {
        acc[domain] = {};
    }
    if (!acc[domain][room]) {
        acc[domain][room] = [];
    }

    acc[domain][room].push(paper);
    return acc;
  }, {} as { [domain: string]: { [room: string]: Event[] } });

  const handleScheduleDateChange = (date: Date | null) => {
    setScheduleViewDate(date);
    if (date) {
      fetchScheduledPapers(date);
    }
  };

  // Add status color functions
  const getStatusColor = (
    status: Paper["presentationStatus"],
    theme: Theme
  ) => {
    switch (status) {
      case "Presented":
        return theme.palette.success.main;
      case "In Progress":
        return theme.palette.warning.main;
      case "Cancelled":
        return theme.palette.error.main;
      default:
        return theme.palette.info.main;
    }
  };

  const getStatusBgColor = (
    status: Paper["presentationStatus"],
    theme: Theme
  ) => {
    switch (status) {
      case "Presented":
        return alpha(theme.palette.success.main, 0.05);
      case "In Progress":
        return alpha(theme.palette.warning.main, 0.05);
      case "Cancelled":
        return alpha(theme.palette.error.main, 0.05);
      default:
        return alpha(theme.palette.info.main, 0.05);
    }
  };

  const getStatusBgHoverColor = (
    status: Paper["presentationStatus"],
    theme: Theme
  ) => {
    switch (status) {
      case "Presented":
        return alpha(theme.palette.success.main, 0.08);
      case "In Progress":
        return alpha(theme.palette.warning.main, 0.08);
      case "Cancelled":
        return alpha(theme.palette.error.main, 0.08);
      default:
        return alpha(theme.palette.info.main, 0.08);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography>Loading your papers...</Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ 
          flexDirection: { xs: 'column', sm: 'row' }, 
          py: { xs: 2, sm: 0 },
          gap: { xs: 1, sm: 0 }
        }}>
          <Typography variant="h6" component="div" sx={{ 
            flexGrow: 1,
            fontSize: { xs: '1.1rem', sm: '1.25rem' }
          }}>
            Presenter Dashboard
          </Typography>
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 2,
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'space-between', sm: 'flex-end' }
          }}>
            <NotificationBell />
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'inherit',
                display: 'block',
                width: 'auto'
              }}
            >
              {user?.email}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ 
        mt: { xs: 2, sm: 4 }, 
        mb: { xs: 2, sm: 4 },
        px: { xs: 1, sm: 2, md: 3 }
      }}>
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="presenter tabs"
            variant={matchesXs ? "fullWidth" : "standard"}
            sx={{
              '& .MuiTab-root': {
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minWidth: { xs: '50%', sm: 160 },
              }
            }}
          >
            <Tab 
              label="My Papers" 
              value="mypapers"
              icon={<AssignmentIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Scheduled Papers" 
              value="schedule"
              icon={<EventIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {activeTab === "mypapers" && (
          <>
            {papers.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 4 },
                  textAlign: "center",
                  borderRadius: 2,
                  border: 1,
                  borderColor: "divider",
                }}
              >
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  No Papers Found
                </Typography>
                <Typography color="textSecondary">
                  You haven't submitted any papers yet.
                </Typography>
              </Paper>
            ) : (
              <>
                <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                  <Typography 
                    variant="h5" 
                    gutterBottom
                    sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                  >
                    My Papers
                  </Typography>
                </Box>
                
                <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
                  {papers.map((paper) => (
                    <Grid item xs={12} key={paper._id}>
                      <Card
                        elevation={0}
                        sx={{
                          borderRadius: 2,
                          border: 1,
                          borderColor: "divider",
                          "&:hover": {
                            borderColor: "primary.main",
                            boxShadow: 1,
                          },
                        }}
                      >
                        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                          <Grid container spacing={{ xs: 1, sm: 2 }}>
                            <Grid item xs={12}>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: { xs: 'column', sm: 'row' },
                                  justifyContent: "space-between",
                                  alignItems: { xs: 'flex-start', sm: 'center' },
                                  gap: { xs: 2, sm: 0 },
                                  mb: 2,
                                }}
                              >
                                <Box sx={{ width: '100%' }}>
                                  <Typography 
                                    variant="h6" 
                                    gutterBottom
                                    sx={{
                                      fontSize: { xs: '1rem', sm: '1.25rem' },
                                      wordBreak: 'break-word'
                                    }}
                                  >
                                    {paper.title}
                                  </Typography>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      gap: 1,
                                      mb: { xs: 1, sm: 2 },
                                      flexWrap: "wrap",
                                    }}
                                  >
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
                                    {paper.selectedSlot && paper.selectedSlot.bookedBy ? (
                                      <Chip
                                        size="small"
                                        icon={<CheckCircleIcon />}
                                        label={paper.selectedSlot.bookedBy === user?.email ? 'Booked by you' : 'Slot Booked'}
                                        color={paper.selectedSlot.bookedBy === user?.email ? 'success' : 'default'}
                                      />
                                    ) : (
                                      <Chip
                                        size="small"
                                        icon={<WarningIcon />}
                                        label="No Slot Selected"
                                        color="warning"
                                      />
                                    )}
                                  </Box>
                                  {paper.selectedSlot && paper.selectedSlot.bookedBy && (
                                    <Box
                                      sx={{
                                        display: "flex",
                                        gap: 1,
                                        flexWrap: "wrap",
                                        mb: { xs: 2, sm: 0 }
                                      }}
                                    >
                                      <Chip
                                        size="small"
                                        icon={<EventIcon />}
                                        label={format(
                                          new Date(paper.selectedSlot.date),
                                          "dd MMM yyyy"
                                        )}
                                        variant="outlined"
                                      />
                                      <Chip
                                        size="small"
                                        icon={<RoomIcon />}
                                        label={`Room ${paper.selectedSlot.room}`}
                                        variant="outlined"
                                      />
                                      <Chip
                                        size="small"
                                        icon={<ScheduleIcon />}
                                        label={paper.selectedSlot.session === 'Session 1' ? 
                                          'Session 1 (9:00 AM - 12:00 PM)' : 
                                          'Session 2 (1:00 PM - 4:00 PM)'}
                                        variant="outlined"
                                      />
                                    </Box>
                                  )}
                                </Box>
                                <Box sx={{ 
                                  display: "flex", 
                                  gap: 1,
                                  width: { xs: '100%', sm: 'auto' },
                                  flexDirection: { xs: 'column', sm: 'row' }
                                }}>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleViewDetails(paper);
                                    }}
                                    startIcon={<PersonIcon />}
                                    tabIndex={0}
                                    fullWidth={matchesXs}
                                  >
                                    Paper Details
                                  </Button>
                                  {(!paper.selectedSlot?.bookedBy ||
                                    paper.selectedSlot?.bookedBy === user?.email) && (
                                    <Button
                                      variant="contained"
                                      size="small"
                                      onClick={() => handleOpenDialog(paper)}
                                      startIcon={<ScheduleIcon />}
                                      fullWidth={matchesXs}
                                    >
                                      {paper.selectedSlot?.bookedBy
                                        ? "Change Slot"
                                        : "Select Slot"}
                                    </Button>
                                  )}
                                </Box>
                              </Box>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </>
        )}

        {activeTab === "schedule" && (
          <Box>
            <Grid container spacing={{ xs: 1, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 4 } }}>
              <Grid item xs={12} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="View Schedule For"
                    value={scheduleViewDate}
                    onChange={handleScheduleDateChange}
                    shouldDisableDate={isDateDisabled}
                    defaultCalendarMonth={new Date(ALLOWED_DATES[0])}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small",
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} md={8}>
                <Box sx={{ 
                  display: "flex", 
                  gap: 1,
                  flexDirection: { xs: 'column', sm: 'row' }
                }}>
                  <FormControl 
                    size="small" 
                    sx={{ 
                      minWidth: { xs: '100%', sm: 120 }
                    }}
                  >
                    <InputLabel>Search By</InputLabel>
                    <Select
                      value={searchCriteria}
                      label="Search By"
                      onChange={(e) =>
                        setSearchCriteria(e.target.value as SearchCriteria)
                      }
                    >
                      <MenuItem value="default">Default</MenuItem>
                      <MenuItem value="paperId">Paper ID</MenuItem>
                      <MenuItem value="title">Title</MenuItem>
                      <MenuItem value="presenter">Presenter</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    size="small"
                    label={`Search by ${
                      searchCriteria === "default"
                        ? "all criteria"
                        : searchCriteria
                    }`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Grid>
            </Grid>

            {Object.entries(groupedByDomain).map(([domain, rooms]) => (
              <Accordion
                key={domain}
                expanded={expandedDomain === domain}
                onChange={handleDomainChange(domain)}
                sx={{
                  mb: { xs: 1, sm: 2 },
                  "&:before": { display: "none" },
                  borderRadius: "8px !important",
                  overflow: "hidden",
                  border: 1,
                  borderColor: "divider",
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    backgroundColor: theme.palette.primary.light,
                    color: "white",
                    "& .MuiAccordionSummary-expandIconWrapper": {
                      color: "white",
                    },
                  }}
                  tabIndex={0}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <DomainIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">{domain}</Typography>
                    <Chip
                      size="small"
                      label={`${Object.keys(rooms).length} Rooms`}
                      sx={{
                        ml: 2,
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                      }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                  {Object.entries(rooms).map(([room, roomEvents]) => (
                    <Accordion
                      key={`${domain}-${room}`}
                      expanded={expandedRooms[`${domain}-${room}`] || false}
                      onChange={handleAccordionRoomChange(`${domain}-${room}`)}
                      sx={{
                        mb: { xs: 1, sm: 2 },
                        "&:before": { display: "none" },
                        borderRadius: 1,
                        overflow: "hidden",
                        border: 1,
                        borderColor: "divider",
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          backgroundColor: alpha(theme.palette.primary.main, 0.05),
                          "&:hover": {
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          },
                        }}
                        tabIndex={0}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <RoomIcon color="primary" />
                          <Typography variant="h6">{room}</Typography>
                          <Chip
                            label={`${roomEvents.length} Events`}
                            size="small"
                            sx={{ ml: 2 }}
                          />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                        <TableContainer sx={{ 
                          maxWidth: '100%',
                          overflowX: 'auto',
                          '-webkit-overflow-scrolling': 'touch',
                          '&::-webkit-scrollbar': {
                            height: 6
                          },
                          '&::-webkit-scrollbar-track': {
                            backgroundColor: 'rgba(0,0,0,0.1)'
                          },
                          '&::-webkit-scrollbar-thumb': {
                            borderRadius: 3,
                            backgroundColor: 'rgba(0,0,0,0.2)'
                          }
                        }}>
                          <Table 
                            size={matchesXs ? "small" : "medium"} 
                            aria-label="schedule"
                            sx={{
                              minWidth: { xs: 650, sm: 800 }
                            }}
                          >
                            <TableHead>
                              <TableRow>
                                <StyledTableCell>Time</StyledTableCell>
                                <StyledTableCell>Title</StyledTableCell>
                                <StyledTableCell>Paper-ID</StyledTableCell>
                                <StyledTableCell>Type</StyledTableCell>
                                <StyledTableCell>Presenters/Speaker</StyledTableCell>
                                <StyledTableCell>Status</StyledTableCell>
                                <StyledTableCell align="right">Actions</StyledTableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {roomEvents
                                .sort((a, b) => {
                                  const timeA = a.isSpecialSession ? a.startTime : a.selectedSlot?.session;
                                  const timeB = b.isSpecialSession ? b.startTime : b.selectedSlot?.session;
                                  return (timeA || '').localeCompare(timeB || '');
                                })
                                .map((event) => (
                                  <StyledTableRow 
                                    key={event._id}
                                    sx={{
                                      backgroundColor: event.isSpecialSession 
                                        ? alpha(theme.palette.secondary.main, 0.05)
                                        : 'inherit',
                                      '&:hover': {
                                        backgroundColor: event.isSpecialSession
                                          ? alpha(theme.palette.secondary.main, 0.08)
                                          : alpha(theme.palette.primary.main, 0.04),
                                      },
                                    }}
                                  >
                                    <StyledTableCell>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ScheduleIcon fontSize="small" color="action" />
                                        {event.isSpecialSession ? (
                                          <>
                                            {event.startTime} - {event.endTime}
                                            <Chip
                                              size="small"
                                              label={event.sessionType}
                                              color="secondary"
                                              sx={{ ml: 1 }}
                                            />
                                          </>
                                        ) : (
                                          event.selectedSlot?.session === 'Session 1' 
                                            ? 'Session 1 (9:00 AM - 12:00 PM)'
                                            : 'Session 2 (1:00 PM - 4:00 PM)'
                                        )}
                                      </Box>
                                    </StyledTableCell>
                                    <StyledTableCell>
                                      <Typography variant="body2">
                                        {event.title}
                                      </Typography>
                                      {event.isSpecialSession && event.description && (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          {event.description}
                                        </Typography>
                                      )}
                                    </StyledTableCell>
                                    <StyledTableCell>
    {event.paperId || 'N/A'}
  </StyledTableCell>
                                    <StyledTableCell>
                                      <Chip
                                        size="small"
                                        label={event.isSpecialSession ? 'Special Session' : 'Presentation'}
                                        color={event.isSpecialSession ? 'secondary' : 'primary'}
                                      />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                      {event.isSpecialSession ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <PersonIcon fontSize="small" color="action" />
                                          {event.speaker}
                                        </Box>
                                      ) : (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                          {event.presenters?.map((presenter, index) => (
                                            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                              <PersonIcon fontSize="small" color="action" />
                                              {presenter.name}
                                            </Box>
                                          ))}
                                        </Box>
                                      )}
                                    </StyledTableCell>
                                    <StyledTableCell>
                                      {!event.isSpecialSession && (
                                        <Chip
                                          label={event.presentationStatus}
                                          size="small"
                                          sx={{
                                            color: getStatusColor(event.presentationStatus || 'Scheduled', theme),
                                            bgcolor: getStatusBgColor(event.presentationStatus || 'Scheduled', theme),
                                            '&:hover': {
                                              bgcolor: getStatusBgHoverColor(event.presentationStatus || 'Scheduled', theme),
                                            },
                                          }}
                                        />
                                      )}
                                    </StyledTableCell>
                                    <StyledTableCell align="right">
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleViewDetails(event);
                                        }}
                                        startIcon={<EventIcon />}
                                        tabIndex={0}
                                      >
                                        View Details
                                      </Button>
                                    </StyledTableCell>
                                  </StyledTableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        <PaperDetails
          paper={selectedPaper}
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
        />

        <Dialog
          open={slotSelectionOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              margin: { xs: 1, sm: 2 },
              width: { xs: 'calc(100% - 16px)', sm: '100%' },
              maxHeight: { xs: 'calc(100% - 16px)', sm: '80vh' }
            }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Select Presentation Slot</Typography>
              {isSlotSelecting && (
                <CircularProgress size={24} sx={{ ml: 2 }} />
              )}
            </Box>
          </DialogTitle>
          <DialogContent>
            {slotError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {slotError}
              </Alert>
            )}
            <Box sx={{ mt: 2 }}>
              <SlotSelectionGrid
                allSlotData={allSlotData}
                onSlotSelect={handleSlotSelect}
                onCancel={handleCloseDialog}
                disabled={isSlotSelecting}
              />
            </Box>
          </DialogContent>
        </Dialog>

        {/* Success Message Snackbar */}
        <Snackbar
          open={!!successMessage}
          autoHideDuration={5000}
          onClose={() => setSuccessMessage(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setSuccessMessage(null)} 
            severity="success"
            sx={{ width: '100%' }}
          >
            {successMessage}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default PresenterHome;
