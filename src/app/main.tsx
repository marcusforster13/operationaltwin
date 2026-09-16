import {AuthGate} from '../features/auth/AuthGate';
import {createRoot} from 'react-dom/client';
import {ErrorBoundary} from './ErrorBoundary';
import {App} from './App';
import './styles.css';
createRoot(document.getElementById('root')!).render(<ErrorBoundary><AuthGate><App/></AuthGate></ErrorBoundary>);
