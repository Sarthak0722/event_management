import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  useTheme,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  useMediaQuery
} from '@mui/material';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend
} from 'chart.js';


import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import axios from '../config/axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, ChartLegend);

interface PaperStats {
  name: string;
  value: number;
}

const AdminDashboard: React.FC = () => {
  const theme = useTheme();
  const matchesXs = useMediaQuery(theme.breakpoints.down('sm'));
  const matchesMd = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const navigate = useNavigate();
  const [domainChartData, setDomainChartData] = useState<any>(null);
  const [schedulingStats, setSchedulingStats] = useState<PaperStats[]>([]);
  const [presentationStats, setPresentationStats] = useState<PaperStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Colors for the pie charts
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.success.main,
  ];

  // Domain abbreviation mapping
  const domainAbbreviations: { [key: string]: string } = {
    'ICT in Engineering Education': 'IIEE',
    'Data Storage, Modeling and Big Data Analytics': 'DSMABDA',
    'Artificial Intelligence, Machine Learning and Computational Intelligence': 'AIML',
    'Cognitive Systems, Vision and Perception': 'CSVP',
    'Embedded Systems and Internet of Things': 'ESIoT',
    'Advanced Communication Technologies': 'ACT',
    'Cyber Security': 'CS'
  };

  useEffect(() => {
    // Check if user is authenticated and is an admin
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchStats();
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching statistics...');
  
      // Get scheduling and presentation stats
      const response = await axios.get('/papers/stats');
      console.log('Statistics response:', response.data);
  
      if (response.data.success) {
        const { schedulingStats, presentationStats } = response.data.data;
  
        // Format scheduling stats
        setSchedulingStats([
          { name: 'Scheduled', value: schedulingStats?.scheduled || 0 },
          { name: 'Not Scheduled', value: schedulingStats?.notScheduled || 0 }
        ]);
  
        // Format presentation stats
        setPresentationStats([
          { name: 'Presented', value: presentationStats?.presented || 0 },
          { name: 'In Progress', value: presentationStats?.inProgress || 0 },
          { name: 'Scheduled', value: presentationStats?.scheduled || 0 },
          { name: 'Cancelled', value: presentationStats?.cancelled || 0 }
        ]);
      } else {
        throw new Error(response.data.message || 'Failed to fetch statistics');
      }
  
      // Get domain-wise paper data
      const allPapersResponse = await axios.get('/papers');
      const papersByDomain = allPapersResponse.data.data;
  
      const domainLabels = Object.keys(papersByDomain);
      const domainCounts = domainLabels.map(domain => papersByDomain[domain].length);
  
      setDomainChartData({
        labels: domainLabels,
        datasets: [
          {
            label: 'Number of Papers',
            data: domainCounts,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderRadius: 6
          }
        ]
      });
    } catch (err: any) {
      console.error('Error fetching statistics:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load statistics';
      setError(errorMessage);
  
      if (err.response?.status === 401) {
        navigate('/login');
        return;
      }
  
      // Set defaults in case of error
      setSchedulingStats([
        { name: 'Scheduled', value: 0 },
        { name: 'Not Scheduled', value: 0 }
      ]);
      setPresentationStats([
        { name: 'Presented', value: 0 },
        { name: 'In Progress', value: 0 },
        { name: 'Scheduled', value: 0 },
        { name: 'Cancelled', value: 0 }
      ]);
      setDomainChartData(null);
    } finally {
      setLoading(false);
    }
  };
  
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, value, name } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * (matchesXs ? 0.7 : 0.9);
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const sin = Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);
    const textAnchor = cos >= 0 ? 'start' : 'end';
    const percentage = (percent * 100).toFixed(0);

    const shortenedName = matchesXs && name.length > 10 ? `${name.slice(0, 8)}...` : name;

    return (
      <text
        x={x}
        y={y}
        fill={theme.palette.text.primary}
        textAnchor={textAnchor}
        dominantBaseline="central"
        fontSize={matchesXs ? "8px" : "10px"}
      >
        {`${shortenedName}: ${value} (${percentage}%)`}
      </text>
    );
  };

  if (!user || user.role !== 'admin') {
    return null; // Let the useEffect handle the redirect
  }

  return (
    <Container maxWidth="lg" sx={{ 
      mt: { xs: 2, sm: 3, md: 4 }, 
      mb: { xs: 2, sm: 3, md: 4 },
      px: { xs: 1, sm: 2, md: 3 }
    }}>
      <Typography 
        variant={matchesXs ? "h5" : "h4"} 
        gutterBottom 
        sx={{ 
          mb: { xs: 2, sm: 3, md: 4 },
          fontSize: { xs: '1.5rem', sm: '2rem' }
        }}
      >
        Analytics Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: { xs: 2, sm: 3 } }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: { xs: 2, sm: 4 } }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {/* Scheduling Status Chart */}
          <Grid item xs={12} md={6}>
            <Paper sx={{
              p: { xs: 2, sm: 3 },
              display: 'flex',
              flexDirection: 'column',
              height: { xs: 300, sm: 350, md: 400 },
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
              overflow: 'hidden'
            }}>
              <Typography 
                variant={matchesXs ? "subtitle1" : "h6"} 
                gutterBottom
                sx={{ mb: { xs: 1, sm: 2 } }}
              >
                Paper Scheduling Status
              </Typography>
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={schedulingStats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={matchesXs ? 70 : matchesMd ? 80 : 90}
                    innerRadius={matchesXs ? 35 : matchesMd ? 40 : 45}
                  >
                    {schedulingStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    height={30}
                    wrapperStyle={{
                      fontSize: matchesXs ? '10px' : '12px',
                      paddingTop: '8px',
                      width: '100%',
                      margin: '0 auto'
                    }}
                    align="center"
                  />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Presentation Status Chart */}
          <Grid item xs={12} md={6}>
            <Paper sx={{
              p: { xs: 2, sm: 3 },
              display: 'flex',
              flexDirection: 'column',
              height: { xs: 300, sm: 350, md: 400 },
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
              overflow: 'hidden'
            }}>
              <Typography 
                variant={matchesXs ? "subtitle1" : "h6"} 
                gutterBottom
                sx={{ mb: { xs: 1, sm: 2 } }}
              >
                Presentation Status
              </Typography>
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={presentationStats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={matchesXs ? 70 : matchesMd ? 80 : 90}
                    innerRadius={matchesXs ? 35 : matchesMd ? 40 : 45}
                  >
                    {presentationStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    height={30}
                    wrapperStyle={{
                      fontSize: matchesXs ? '10px' : '12px',
                      paddingTop: '8px',
                      width: '100%',
                      margin: '0 auto'
                    }}
                    align="center"
                  />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Summary Cards */}
          <Grid item xs={12}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Total Papers
                    </Typography>
                    <Typography variant="h4">
                      {schedulingStats.reduce((acc, curr) => acc + curr.value, 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Scheduled Papers
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {schedulingStats.find(stat => stat.name === 'Scheduled')?.value || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Presented Papers
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {presentationStats.find(stat => stat.name === 'Presented')?.value || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Pending Papers
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {schedulingStats.find(stat => stat.name === 'Not Scheduled')?.value || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Domain Distribution Chart */}
          <Grid item xs={12}>
            <Paper sx={{
              p: { xs: 2, sm: 3 },
              display: 'flex',
              flexDirection: 'column',
              height: { xs: 300, sm: 350, md: 400 },
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
              overflow: 'hidden'
            }}>
              <Typography 
                variant={matchesXs ? "subtitle1" : "h6"} 
                gutterBottom
                sx={{ mb: { xs: 1, sm: 2 } }}
              >
                Domain-wise Paper Distribution
              </Typography>
              <Box sx={{ width: '100%', height: '85%', position: 'relative' }}>
                {domainChartData && (
                  <Bar
                    data={{
                      ...domainChartData,
                      labels: domainChartData.labels.map((label: string) => 
                        domainAbbreviations[label] || label
                      )
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            title: (context: any[]) => {
                              const abbreviation = context[0].label;
                              // Find the original domain name
                              const fullName = Object.keys(domainAbbreviations).find(
                                key => domainAbbreviations[key] === abbreviation
                              ) || abbreviation;
                              return fullName;
                            },
                            label: (context: any) => {
                              return `Papers: ${context.raw}`;
                            }
                          },
                          titleFont: {
                            size: 14
                          },
                          padding: 10,
                          titleSpacing: 4,
                          bodySpacing: 4,
                          displayColors: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            font: {
                              size: matchesXs ? 10 : 12
                            }
                          }
                        },
                        x: {
                          ticks: {
                            font: {
                              size: matchesXs ? 8 : 10
                            },
                            maxRotation: 45,
                            minRotation: 45
                          }
                        }
                      },
                      layout: {
                        padding: {
                          bottom: matchesXs ? 15 : 20
                        }
                      }
                    }}
                  />
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default AdminDashboard;