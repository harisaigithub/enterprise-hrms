import DashboardRouter from "./routes/DashboardRouter";

function App() {
  const role = "HR"; // Later this will come from the backend

  return <DashboardRouter role={role} />;
}

export default App;