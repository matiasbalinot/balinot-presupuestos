import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import BudgetList from "./pages/BudgetList";
import BudgetEditor from "./pages/BudgetEditor";
import TeamPage from "./pages/TeamPage";
import HistoryPage from "./pages/HistoryPage";
import ConfigPage from "./pages/ConfigPage";
import DataPanel from "./pages/DataPanel";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/presupuestos" component={BudgetList} />
      <Route path="/presupuestos/nuevo" component={BudgetEditor} />
      <Route path="/presupuestos/:id" component={BudgetEditor} />
      <Route path="/equipo" component={TeamPage} />
      <Route path="/historico" component={HistoryPage} />
      <Route path="/configuracion" component={ConfigPage} />
      <Route path="/datos" component={DataPanel} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
