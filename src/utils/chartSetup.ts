/**
 * Chart.js global configuration & component registration
 * Registers all scales (CategoryScale, LinearScale, RadialLinearScale, etc.),
 * controllers (Bar, Line, Doughnut, Pie), elements, and plugins for react-chartjs-2.
 */
import 'chart.js/auto';
import {
  Chart as ChartJS,
  registerables,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
} from 'chart.js';

ChartJS.register(
  ...registerables,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale
);

export { ChartJS };

