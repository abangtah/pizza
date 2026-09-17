import './styles/main.scss';
import { UIController } from './ui';

// Initialize the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // We can add a simple entry animation here for the piazza
  new UIController();
  console.log('Advent Calendar Framework Initialized');
});
