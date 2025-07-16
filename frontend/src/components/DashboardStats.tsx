import React, { useEffect, useState } from 'react';
import {
  Typography, Grid, Paper, Box, CircularProgress, Alert, Card, CardContent,
  useMediaQuery
} from '@mui/material';
import { Bar } from 'react-chartjs-2';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import axios from '../config/axios';
import { useTheme } from '@mui/material/styles';

const DashboardStats: React.FC = () => {
  const theme = useTheme();
  const matchesXs = useMediaQuery(theme.breakpoints.down('sm'));
  const matchesMd = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [presentationStats, setPresentationStats] = useState<any[]>([]);
  const [domainChartData, setDomainChartData] = useState<any>(null);
  const [fullDomainNames, setFullDomainNames] = useState<{ [key: string]: string }>({});

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
    const fetchStats = async () => {
      try {
        const res = await axios.get('/papers/stats/public');
        const allPapersRes = await axios.get('/papers');

        const { presentationStats } = res.data.data;
        const domainLabels = Object.keys(allPapersRes.data.data);
        const domainCounts = domainLabels.map(domain => allPapersRes.data.data[domain].length);

        // Create reverse mapping for abbreviations to full names
        const reverseMapping: { [key: string]: string } = {};
        domainLabels.forEach(fullName => {
          const abbr = domainAbbreviations[fullName] || fullName;
          reverseMapping[abbr] = fullName;
        });
        setFullDomainNames(reverseMapping);

        setPresentationStats([
          { name: 'Presented', value: presentationStats?.presented || 0 },
          { name: 'In Progress', value: presentationStats?.inProgress || 0 },
          { name: 'Scheduled', value: presentationStats?.scheduled || 0 },
          { name: 'Cancelled', value: presentationStats?.cancelled || 0 },
        ]);
        
        setDomainChartData({
          labels: domainLabels.map(label => domainAbbreviations[label] || label),
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
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const renderLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, value, name } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const percentage = (percent * 100).toFixed(0);
    return (
      <text x={x} y={y} fill={theme.palette.text.primary} textAnchor="start" dominantBaseline="central" fontSize="12px">
        {`${name}: ${value} (${percentage}%)`}
      </text>
    );
  };

  if (loading) return <Box textAlign="center" py={5}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ 
      my: { xs: 3, sm: 4, md: 6 },
      px: { xs: 1, sm: 2, md: 3 }
    }}>
      <Typography 
        variant={matchesXs ? "h5" : "h4"} 
        align="center" 
        gutterBottom
        sx={{ 
          mb: { xs: 2, sm: 3, md: 4 },
          fontSize: { xs: '1.5rem', sm: '2rem' }
        }}
      >
        Conference Stats
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 4,
            }
          }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Total Papers
              </Typography>
              <Typography variant={matchesXs ? "h6" : "h5"}>
                {presentationStats.reduce((acc, stat) => acc + stat.value, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 4,
            }
          }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Presented
              </Typography>
              <Typography variant={matchesXs ? "h6" : "h5"} color="success.main">
                {presentationStats.find(stat => stat.name === 'Presented')?.value || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 4,
            }
          }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Scheduled
              </Typography>
              <Typography variant={matchesXs ? "h6" : "h5"} color="primary">
                {presentationStats.find(stat => stat.name === 'Scheduled')?.value || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 4,
            }
          }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Cancelled
              </Typography>
              <Typography variant={matchesXs ? "h6" : "h5"} color="error">
                {presentationStats.find(stat => stat.name === 'Cancelled')?.value || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: { xs: 2, sm: 3, md: 5 }, 
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
                  outerRadius={matchesXs ? 60 : matchesMd ? 70 : 80}
                  innerRadius={matchesXs ? 30 : matchesMd ? 35 : 40}
                  label={renderLabel}
                >
                  {presentationStats.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{
                    fontSize: matchesXs ? '10px' : '12px',
                    paddingTop: '10px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: { xs: 2, sm: 3, md: 5 }, 
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
              <Bar
                data={domainChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { 
                      position: 'top',
                      labels: {
                        font: {
                          size: matchesXs ? 10 : 12
                        },
                        boxWidth: matchesXs ? 10 : 15,
                        padding: 8
                      },
                      display: false
                    },
                    title: { display: false },
                    tooltip: {
                      callbacks: {
                        title: (context: any[]) => {
                          const abbreviation = context[0].label;
                          return fullDomainNames[abbreviation] || abbreviation;
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
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardStats;
