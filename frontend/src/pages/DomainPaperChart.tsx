import React, { useEffect, useState } from 'react';
import axios from '../config/axios'; // Adjust the path if needed
import { Paper, Typography, Paper as MuiPaper } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DomainPaperChart = () => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const fetchAllPapers = async () => {
      try {
        const response = await axios.get('/papers');
        const papersByDomain = response.data.data;

        // Convert to chart-friendly format
        const labels = Object.keys(papersByDomain);
        const counts = labels.map(domain => papersByDomain[domain].length);

        setChartData({
          labels,
          datasets: [
            {
              label: 'Number of Papers',
              data: counts,
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderRadius: 6
            }
          ]
        });
      } catch (error) {
        console.error('Error fetching papers:', error);
      }
    };

    fetchAllPapers();
  }, []);

  return (
    <MuiPaper elevation={3} sx={{ padding: 4, maxWidth: 800, mx: 'auto', my: 4 }}>
      <Typography variant="h6" gutterBottom align="center">
        Domain-wise Paper Distribution
      </Typography>
      {chartData ? (
        <Bar
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              legend: { position: 'top' },
              title: {
                display: false
              }
            }
          }}
        />
      ) : (
        <Typography align="center">Loading chart...</Typography>
      )}
    </MuiPaper>
  );
};

export default DomainPaperChart;
