
import { SocketProvider, useSocket } from './services/SocketContext';
import Home from './pages/Home';


function App() {
  return (
    <SocketProvider>
      <Home />

    </SocketProvider>
  );
}

export default App;